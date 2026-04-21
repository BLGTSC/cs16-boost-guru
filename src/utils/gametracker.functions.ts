import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  ip: z.string().min(7).max(45).regex(/^[0-9.]+$/, "IP invalid"),
  port: z.number().int().min(1).max(65535),
});

export interface GameTrackerInfo {
  hostname: string | null;
  current_map: string | null;
  players_current: number;
  players_max: number;
  game_mod: string | null;
  online: boolean;
  source: "gametracker" | "steam" | "fallback" | "none";
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/**
 * Multi-source server info lookup. Tries in order:
 *  1. GameTracker.com HTML scrape (richest data: hostname, map, players, mod)
 *  2. Steam Web API GetServersAtAddress (hostname + map + players, JSON, no key)
 *  3. Fallback: synthesized hostname "CS 1.6 Server <IP:PORT>"
 *
 * UDP A2S_INFO is intentionally NOT used: Cloudflare Workers (the runtime for
 * server functions in this project) do not support raw UDP sockets.
 */
export const queryGameTracker = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<GameTrackerInfo> => {
    // Source 1: GameTracker
    const gt = await fetchGameTracker(data.ip, data.port);
    if (gt && (gt.hostname || gt.players_max > 0)) {
      return { ...gt, source: "gametracker" };
    }

    // Source 2: Steam Web API
    const steam = await fetchSteamApi(data.ip, data.port);
    if (steam && steam.hostname) {
      return { ...steam, source: "steam" };
    }

    // Source 3: synthesized fallback so listing always has *some* name
    return {
      hostname: `CS 1.6 Server ${data.ip}:${data.port}`,
      current_map: null,
      players_current: 0,
      players_max: 32,
      game_mod: "Counter-Strike",
      online: false,
      source: "fallback",
    };
  });

// ---------------- GameTracker ----------------

async function fetchGameTracker(
  ip: string,
  port: number,
): Promise<Omit<GameTrackerInfo, "source"> | null> {
  const url = `https://www.gametracker.com/server_info/${ip}:${port}/`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // GameTracker shows a generic "No Statistics Available" page with that
    // string in the <title> when the server isn't indexed.
    if (/No Statistics Available/i.test(html)) return null;

    return parseGameTrackerHtml(html);
  } catch (err) {
    console.error("GameTracker fetch failed", err);
    return null;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, "")).trim();
}

function parseGameTrackerHtml(html: string): Omit<GameTrackerInfo, "source"> {
  // Hostname: <title> e cea mai sigură sursă pe GameTracker.
  // Format tipic: "CS.PROCS.RO [cs] Counter Strike 1.6"
  let hostname: string | null = null;
  let game_mod: string | null = null;

  const titleMatch = html.match(/<title>\s*([\s\S]*?)\s*<\/title>/i);
  if (titleMatch) {
    const raw = decodeEntities(titleMatch[1]).replace(/\s+/g, " ").trim();
    // Extragem mod-ul din paranteze drepte: [cs], [zm], [dm] etc.
    const modBracket = raw.match(/\[([^\]]+)\]/);
    if (modBracket) game_mod = modBracket[1].trim();
    // Curățăm: scoatem [tag] și suffix-ul de joc dacă există
    const cleaned = raw
      .replace(/\s*\[[^\]]+\]\s*/g, " ")
      .replace(/\s*Counter[\s-]*Strike(?:\s*1\.6)?\s*$/i, "")
      .replace(/\s*-\s*GameTracker.*$/i, "")
      .trim();
    hostname = cleaned || raw || null;
  }
  if (!hostname) {
    const og = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
    if (og) hostname = decodeEntities(og[1]).trim() || null;
  }

  // Jucători: <span id="HTML_num_players">3</span> / <span id="HTML_max_players">32</span>
  let players_current = 0;
  let players_max = 0;
  const cur = html.match(/id=["']HTML_num_players["'][^>]*>\s*(\d+)/i);
  const max = html.match(/id=["']HTML_max_players["'][^>]*>\s*(\d+)/i);
  if (cur) players_current = parseInt(cur[1], 10);
  if (max) players_max = parseInt(max[1], 10);
  if (!max) {
    const fallback = html.match(/(\d{1,3})\s*\/\s*(\d{1,3})\s*players?/i);
    if (fallback) {
      players_current = parseInt(fallback[1], 10);
      players_max = parseInt(fallback[2], 10);
    }
  }

  // Mapă curentă: <div class="si_map_header" id="HTML_curr_map">de_dust2</div>
  let current_map: string | null = null;
  const mapMatch = html.match(
    /id=["']HTML_curr_map["'][^>]*>\s*([a-zA-Z0-9_\-]+)\s*</i,
  );
  if (mapMatch) current_map = mapMatch[1];

  // Status: <span class="item_color_success">Alive</span> sau item_color_fail
  const aliveMatch = html.match(
    /Status:[\s\S]{0,200}?item_color_(success|fail)["'][^>]*>\s*([A-Za-z]+)/i,
  );
  const online =
    aliveMatch?.[1] === "success" || (!!hostname && players_max > 0);

  return {
    hostname,
    current_map,
    players_current,
    players_max,
    game_mod: game_mod || "Counter-Strike",
    online,
  };
}

// ---------------- Steam Web API ----------------

interface SteamServer {
  addr: string;
  gameport: number;
  steamid?: string;
  name: string;
  appid: number;
  gamedir: string;
  version: string;
  product: string;
  region: number;
  players: number;
  max_players: number;
  bots: number;
  map: string;
  secure: boolean;
  dedicated: boolean;
  os: string;
  gametype?: string;
}

async function fetchSteamApi(
  ip: string,
  port: number,
): Promise<Omit<GameTrackerInfo, "source"> | null> {
  try {
    // GetServersAtAddress returns ALL servers running at a given IP across all
    // game ports. We then find the one that matches our requested port.
    const url = `https://api.steampowered.com/ISteamApps/GetServersAtAddress/v1/?addr=${ip}`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      response?: { success?: boolean; servers?: SteamServer[] };
    };
    const servers = json?.response?.servers ?? [];
    if (servers.length === 0) return null;

    // Match exact IP:port. Steam's `addr` is "ip:queryport" (often == gameport).
    const target = `${ip}:${port}`;
    const match =
      servers.find((s) => s.addr === target || s.gameport === port) ?? servers[0];

    return {
      hostname: match.name?.trim() || null,
      current_map: match.map || null,
      players_current: Math.max(0, (match.players ?? 0) - (match.bots ?? 0)),
      players_max: match.max_players ?? 32,
      game_mod: match.product || match.gamedir || null,
      online: true,
    };
  } catch (err) {
    console.error("Steam Web API fetch failed", err);
    return null;
  }
}
