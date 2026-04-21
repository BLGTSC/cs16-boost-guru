import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NavButton {
  id: string;
  label: string;
  href: string;
  external: boolean;
  icon: string | null;
  sort_order: number;
  active: boolean;
}

export function useNavButtons(onlyActive = true) {
  const [buttons, setButtons] = useState<NavButton[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    let q = supabase.from("nav_buttons").select("*").order("sort_order");
    if (onlyActive) q = q.eq("active", true);
    const { data } = await q;
    setButtons((data as NavButton[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("nav_buttons_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "nav_buttons" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyActive]);

  return { buttons, loading, refresh: load };
}
