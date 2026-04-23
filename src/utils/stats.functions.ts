import { supabase } from "@/integrations/supabase/client";

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

/**
 * Browser-safe wrapper around the `stats-scrape` edge function.
 * SPA-compatible — runs entirely client-side, no server rendering needed.
 */
export async function fetchRedirectStats(): Promise<StatsPayload> {
  const { data, error } = await supabase.functions.invoke<StatsPayload>(
    "stats-scrape",
    { method: "GET" },
  );
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Empty stats response");
  return data;
}
