// Edge function: query GameTracker + Steam Web API for CS 1.6 server info.
// Public (no JWT required) - configured in supabase/config.toml.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

interface GameTrackerInfo {
  hostname: string | null;
  current_map: string | null;
  players_current: number;
  players_max: number;
  game_mod: string | null;
  online: boolean;
  source: "gametracker" | "steam" | "fallback" | "none";
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

function parseGameTrackerHtml(html: string): Omit<GameTrackerInfo, "source"> {
  let hostname: string | null = null;
  let game_mod: string | null = null;

  const titleMatch = html.match(/<title>\s*([\s\S]*?)\s*<\/title>/i);
  if (titleMatch) {
    const raw = decodeEntities(titleMatch[1]).replace(/\s+/g, " ").trim();
    const modBracket = raw.match(/\[([^\]]+)\]/);
    if (modBracket) game_mod = modBracket[1].trim();
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

  let current_map: string | null = null;
  const mapMatch = html.match(/id=["']HTML_curr_map["'][^>]*>\s*([a-zA-Z0-9_\-]+)\s*</i);
  if (mapMatch) current_map = mapMatch[1];

  const aliveMatch = html.match(
    /Status:[\s\S]{0,200}?item_color_(success|fail)["'][^>]*>\s*([A-Za-z]+)/i,
  );
  const online = aliveMatch?.[1] === "success" || (!!hostname && players_max > 0);

  return {
    hostname,
    current_map,
    players_current,
    players_max,
    game_mod: game_mod || "Counter-Strike",
    online,
  };
}

async function fetchGameTracker(ip: string, port: number) {
  const url = `https://www.gametracker.com/server_info/${ip}:${port}/`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (/No Statistics Available/i.test(html)) return null;
    return parseGameTrackerHtml(html);
  } catch (err) {
    console.error("GameTracker fetch failed", err);
    return null;
  }
}

async function fetchSteamApi(ip: string, port: number) {
  try {
    const url = `https://api.steampowered.com/ISteamApps/GetServersAtAddress/v1/?addr=${ip}`;
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) return null;
    const json = await res.json();
    const servers = json?.response?.servers ?? [];
    if (servers.length === 0) return null;
    const target = `${ip}:${port}`;
    const m =
      servers.find((s: any) => s.addr === target || s.gameport === port) ?? servers[0];
    return {
      hostname: m.name?.trim() || null,
      current_map: m.map || null,
      players_current: Math.max(0, (m.players ?? 0) - (m.bots ?? 0)),
      players_max: m.max_players ?? 32,
      game_mod: m.product || m.gamedir || null,
      online: true,
    };
  } catch (err) {
    console.error("Steam API fetch failed", err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const ip = String(body?.ip ?? "").trim();
    const port = Number(body?.port);

    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip) || !port || port < 1 || port > 65535) {
      return new Response(JSON.stringify({ error: "Invalid IP or port" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gt = await fetchGameTracker(ip, port);
    let result: GameTrackerInfo;
    if (gt && (gt.hostname || gt.players_max > 0)) {
      result = { ...gt, source: "gametracker" };
    } else {
      const steam = await fetchSteamApi(ip, port);
      if (steam && steam.hostname) {
        result = { ...steam, source: "steam" };
      } else {
        result = {
          hostname: `CS 1.6 Server ${ip}:${port}`,
          current_map: null,
          players_current: 0,
          players_max: 32,
          game_mod: "Counter-Strike",
          online: false,
          source: "fallback",
        };
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Handler error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
