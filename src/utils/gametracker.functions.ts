import { supabase } from "@/integrations/supabase/client";

export interface GameTrackerInfo {
  hostname: string | null;
  current_map: string | null;
  players_current: number;
  players_max: number;
  game_mod: string | null;
  online: boolean;
  source: "gametracker" | "steam" | "fallback" | "none";
}

/**
 * Browser-safe wrapper around the `gametracker-query` edge function.
 * Works as a SPA call — no server runtime needed (cPanel-compatible).
 */
export async function queryGameTracker(input: {
  ip: string;
  port: number;
}): Promise<GameTrackerInfo> {
  const { data, error } = await supabase.functions.invoke<GameTrackerInfo>(
    "gametracker-query",
    { body: input },
  );
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Empty response from gametracker-query");
  return data;
}
