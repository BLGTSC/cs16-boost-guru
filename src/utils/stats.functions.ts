import { createServerFn } from "@tanstack/react-start";

export interface ChartPoint { d: string; cnt: number }
export interface RankNode { rank: number; name: string; color: string; total: number; today: number; pct: number }
export interface FeedRow { id: number; vps: string; vpsColor: string; name: string; ip: string; ts: string; ago: string }
export interface StatsPayload {
  totals: { allTime: number; today: number; lastHour: number; nodes: number };
  lastSync: string;
  chart: { "7": ChartPoint[]; "14": ChartPoint[]; "30": ChartPoint[] };
  ranking: RankNode[];
  feed: FeedRow[];
}

const SOURCE = "https://stats.cs16radar.com/";

function clean(s: string) {
  return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
}

function num(s: string) {
  return parseInt(s.replace(/[^\d-]/g, ""), 10) || 0;
}

export const fetchRedirectStats = createServerFn({ method: "GET" }).handler(async (): Promise<StatsPayload> => {
  const res = await fetch(SOURCE, {
    headers: { "User-Agent": "Cs16Radar-Stats/1.0", "Accept": "text/html" },
    cf: { cacheTtl: 30, cacheEverything: true } as RequestInit["cf"],
  });
  if (!res.ok) throw new Error(`Source returned ${res.status}`);
  const html = await res.text();

  // --- Stat cards (4 valori în ordine: AllTime, Today, LastHour, Nodes) ---
  const statValues = [...html.matchAll(/<div class="stat-value">([\s\S]*?)<\/div>/g)].map((m) => num(clean(m[1])));
  const totals = {
    allTime: statValues[0] ?? 0,
    today: statValues[1] ?? 0,
    lastHour: statValues[2] ?? 0,
    nodes: statValues[3] ?? 0,
  };

  // --- Last sync ---
  const lastSyncMatch = html.match(/Last sync:\s*([^<]+)</);
  const lastSync = lastSyncMatch ? lastSyncMatch[1].trim() : "";

  // --- Chart data (window-level JS object) ---
  let chart: StatsPayload["chart"] = { "7": [], "14": [], "30": [] };
  const chartMatch = html.match(/const\s+chartData\s*=\s*(\{[\s\S]*?\});/);
  if (chartMatch) {
    try { chart = JSON.parse(chartMatch[1]); } catch { /* ignore */ }
  }

  // --- Ranking rows ---
  const ranking: RankNode[] = [];
  const rankRegex = /<div class="rank-row">[\s\S]*?<span class="rank-num">(\d+)<\/span>[\s\S]*?<span class="rank-dot" style="background:(#[0-9a-fA-F]+)"><\/span>[\s\S]*?<span class="rank-name">([^<]+)<\/span>[\s\S]*?<div class="rank-bar" style="width:(\d+)%[^>]*><\/div>[\s\S]*?<span class="rank-count"><b>([\d,]+)<\/b>\s*\/\s*(\d+)\s*azi<\/span>/g;
  let m: RegExpExecArray | null;
  while ((m = rankRegex.exec(html)) !== null) {
    ranking.push({
      rank: Number(m[1]),
      color: m[2],
      name: m[3].trim(),
      pct: Number(m[4]),
      total: num(m[5]),
      today: Number(m[6]),
    });
  }

  // --- Live feed rows ---
  const feed: FeedRow[] = [];
  const feedRegex = /<tr>\s*<td class="td-id">(\d+)<\/td>\s*<td><span class="td-vps"><span class="vps-badge" style="color:(#[0-9a-fA-F]+)[^"]*"[^>]*>([^<]+)<\/span><\/span><\/td>\s*<td class="td-name">([\s\S]*?)<\/td>\s*<td class="td-ip">([^<]+)<\/td>\s*<td class="td-ts">([^<]+)<\/td>\s*<td class="td-ago">([^<]+)<\/td>/g;
  let f: RegExpExecArray | null;
  while ((f = feedRegex.exec(html)) !== null) {
    feed.push({
      id: Number(f[1]),
      vpsColor: f[2],
      vps: f[3].trim(),
      name: clean(f[4]),
      ip: f[5].trim(),
      ts: f[6].trim(),
      ago: f[7].trim(),
    });
  }

  return { totals, lastSync, chart, ranking, feed };
});
