import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type ContentMap = Record<string, string>;

interface SiteContentCtx {
  content: ContentMap;
  loading: boolean;
  refresh: () => Promise<void>;
  get: (key: string, fallback?: string) => string;
}

const Ctx = createContext<SiteContentCtx | undefined>(undefined);

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ContentMap>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from("site_content").select("key,value");
    const map: ContentMap = {};
    (data ?? []).forEach((row) => {
      map[row.key] = row.value;
    });
    setContent(map);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("site_content_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_content" }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function get(key: string, fallback = "") {
    return content[key] ?? fallback;
  }

  return (
    <Ctx.Provider value={{ content, loading, refresh: load, get }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSiteContent() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSiteContent must be used within SiteContentProvider");
  return ctx;
}
