import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { queryGameTracker } from "@/utils/gametracker.functions";
import { toast } from "sonner";

interface Listing {
  id: string;
  ip: string;
  port: number;
  hostname: string | null;
  current_map: string | null;
  players_current: number;
  players_max: number;
  game_mod: string | null;
  approved: boolean;
  query_failed: boolean;
  submitted_by_email: string | null;
  created_at: string;
  last_queried_at: string | null;
}

export function ListingsTab() {
  const [items, setItems] = useState<Listing[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    let q = supabase
      .from("listed_servers")
      .select(
        "id,ip,port,hostname,current_map,players_current,players_max,game_mod,approved,query_failed,submitted_by_email,created_at,last_queried_at",
      )
      .order("created_at", { ascending: false });
    if (filter === "pending") q = q.eq("approved", false);
    if (filter === "approved") q = q.eq("approved", true);
    const { data } = await q;
    setItems((data as Listing[]) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function approve(id: string) {
    const { error } = await supabase
      .from("listed_servers")
      .update({ approved: true })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Listare aprobată");
    load();
  }

  async function reject(id: string) {
    if (!confirm("Ștergi această listare definitiv?")) return;
    const { error } = await supabase.from("listed_servers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Listare ștearsă");
    load();
  }

  async function refresh(item: Listing) {
    setBusyId(item.id);
    try {
      const info = await queryGameTracker({ ip: item.ip, port: item.port });
      const { error } = await supabase
        .from("listed_servers")
        .update({
          hostname: info.hostname ?? item.hostname,
          current_map: info.current_map ?? item.current_map,
          players_current: info.players_current,
          players_max: info.players_max || item.players_max,
          game_mod: info.game_mod ?? item.game_mod,
          last_queried_at: new Date().toISOString(),
          query_failed: !info.online,
        })
        .eq("id", item.id);
      if (error) throw error;
      toast.success(info.online ? "Date actualizate" : "Server offline / nedetectabil");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Eroare");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(["pending", "approved", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded border text-xs font-heading uppercase tracking-wider ${
              filter === f
                ? "bg-primary/15 border-primary/50 text-foreground"
                : "border-border text-text-dim hover:text-foreground"
            }`}
          >
            {f === "pending" ? "În așteptare" : f === "approved" ? "Aprobate" : "Toate"} (
            {items.length})
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <Th>Server</Th>
              <Th>Hartă/Jucători</Th>
              <Th>Trimis de</Th>
              <Th>Status</Th>
              <Th>Acțiuni</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-b border-border/40 hover:bg-bg-hover/30">
                <td className="py-3">
                  <div className="font-semibold text-sm">
                    {s.hostname || (
                      <span className="text-text-muted italic">(fără hostname)</span>
                    )}
                  </div>
                  <div className="font-mono text-xs text-text-muted">
                    {s.ip}:{s.port}
                    {s.game_mod ? ` • ${s.game_mod}` : ""}
                  </div>
                </td>
                <td className="py-3 text-xs font-mono">
                  <div className="text-text-dim">{s.current_map || "—"}</div>
                  <div className="text-success">
                    {s.players_current}/{s.players_max}
                  </div>
                </td>
                <td className="py-3 text-xs">
                  {s.submitted_by_email || (
                    <span className="text-text-muted">anonim</span>
                  )}
                  <div className="text-text-muted text-[0.65rem] mt-0.5">
                    {new Date(s.created_at).toLocaleDateString("ro-RO")}
                  </div>
                </td>
                <td className="py-3 text-xs">
                  {s.approved ? (
                    <span className="text-success font-mono uppercase">aprobat</span>
                  ) : (
                    <span className="text-warning font-mono uppercase">pending</span>
                  )}
                  {s.query_failed && (
                    <div className="text-destructive text-[0.65rem] mt-0.5">
                      ⚠ query eșuat
                    </div>
                  )}
                </td>
                <td className="py-3 space-x-2 whitespace-nowrap">
                  <button
                    onClick={() => refresh(s)}
                    disabled={busyId === s.id}
                    className="text-primary hover:underline text-xs font-heading uppercase disabled:opacity-50"
                  >
                    {busyId === s.id ? "..." : "↻ Refresh"}
                  </button>
                  {!s.approved && (
                    <button
                      onClick={() => approve(s.id)}
                      className="text-success hover:underline text-xs font-heading uppercase"
                    >
                      ✓ Aprobă
                    </button>
                  )}
                  <button
                    onClick={() => reject(s.id)}
                    className="text-destructive hover:underline text-xs font-heading uppercase"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 text-center text-text-muted text-sm"
                >
                  Nimic aici.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-[0.68rem] font-mono uppercase tracking-[2px] text-text-muted py-2">
      {children}
    </th>
  );
}
