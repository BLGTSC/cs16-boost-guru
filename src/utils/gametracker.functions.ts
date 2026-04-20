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
}

/**
 * Scrape minimal server info from gametracker.com.
 * Returns nulls where scraping failed (server not indexed, layout change, etc.).
 */
export const queryGameTracker = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<GameTrackerInfo> => {
    const url = `https://www.gametracker.com/server_info/${data.ip}:${data.port}/`;

    try {
      const res = await fetch(url, {
        headers: {
          // Pretend to be a real browser; GameTracker blocks generic UAs
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      if (!res.ok) {
        return emptyResult();
      }

      const html = await res.text();
      return parseGameTrackerHtml(html);
    } catch (err) {
      console.error("GameTracker fetch failed", err);
      return emptyResult();
    }
  });

function emptyResult(): GameTrackerInfo {
  return {
    hostname: null,
    current_map: null,
    players_current: 0,
    players_max: 0,
    game_mod: null,
    online: false,
  };
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

function parseGameTrackerHtml(html: string): GameTrackerInfo {
  // Hostname: <h1 class="HTitle"> ... </h1>  OR  <meta property="og:title" content="...">
  let hostname: string | null = null;
  const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
  if (ogTitle) {
    hostname = decodeEntities(ogTitle[1])
      .replace(/^Game server\s*[-|]\s*/i, "")
      .replace(/\s*-\s*GameTracker.*$/i, "")
      .trim() || null;
  }
  if (!hostname) {
    const h1 = html.match(/<h1[^>]*class="[^"]*HTitle[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1) hostname = stripTags(h1[1]) || null;
  }

  // Players "x / y": typical pattern in info table
  let players_current = 0;
  let players_max = 0;
  const playersMatch = html.match(/(\d{1,3})\s*\/\s*(\d{1,3})\s*players?/i);
  if (playersMatch) {
    players_current = parseInt(playersMatch[1], 10);
    players_max = parseInt(playersMatch[2], 10);
  } else {
    // Fallback: structured info table cell
    const cell = html.match(
      /Current Players[\s\S]*?<td[^>]*>\s*(\d+)\s*\/\s*(\d+)/i,
    );
    if (cell) {
      players_current = parseInt(cell[1], 10);
      players_max = parseInt(cell[2], 10);
    }
  }

  // Current map: appears in info table OR in og:description
  let current_map: string | null = null;
  const mapTd = html.match(
    /Current\s*Map[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
  );
  if (mapTd) {
    const stripped = stripTags(mapTd[1]);
    if (stripped && stripped.length < 64) current_map = stripped;
  }
  if (!current_map) {
    const ogDesc = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
    if (ogDesc) {
      const m = ogDesc[1].match(/Map:\s*([^\s,|]+)/i);
      if (m) current_map = m[1];
    }
  }

  // Game / mod
  let game_mod: string | null = null;
  const gameTd = html.match(/Game[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
  if (gameTd) {
    const stripped = stripTags(gameTd[1]);
    if (stripped && stripped.length < 64) game_mod = stripped;
  }

  // Online if we got at least hostname or non-zero max
  const online = !!hostname || players_max > 0;

  return {
    hostname,
    current_map,
    players_current,
    players_max,
    game_mod,
    online,
  };
}
