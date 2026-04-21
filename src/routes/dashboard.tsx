import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { Countdown } from "@/components/Countdown";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    }
  },
  component: DashboardPage,
});

interface ServerWithPkg {
  id: string;
  name: string;
  ip: string;
  port: number;
  status: string;
  expires_at: string | null;
  packages: { name: string; color: string } | null;
}

interface OrderRow {
  id: string;
  order_number: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  packages: { name: string; color: string } | null;
}

function DashboardPage() {
  const { user } = useAuth();
  const [servers, setServers] = useState<ServerWithPkg[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("servers")
      .select("id,name,ip,port,status,expires_at,packages(name,color)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setServers((data as unknown as ServerWithPkg[]) ?? []));

    supabase
      .from("orders")
      .select("id,order_number,amount,payment_method,status,created_at,packages(name,color)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as unknown as OrderRow[]) ?? []));
  }, [user]);

  const activeServers = servers.filter((s) => s.status === "active").length;
  const totalSpent = orders.filter((o) => o.status === "paid").reduce((acc, o) => acc + Number(o.amount), 0);

  async function deleteServer(id: string) {
    if (!confirm("Sigur ștergi acest server?")) return;
    const { error } = await supabase.from("servers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setServers((prev) => prev.filter((s) => s.id !== id));
    toast.success("Server șters");
  }

  return (
    <section className="py-12 px-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <SectionHeader label="// Contul meu" title="Dashboard" />
        <Link
          to="/boost"
          search={{ pkg: "" }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-bold text-sm uppercase tracking-wider px-5 py-2.5 rounded transition-all"
        >
          + Adaugă Server
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <Stat value={activeServers} label="Servere Active" />
        <Stat value={orders.length} label="Total Comenzi" />
        <Stat value={`€${totalSpent.toFixed(0)}`} label="Total Cheltuit" />
        <Link to="/boost" search={{ pkg: "" }} className="bg-card border border-dashed border-primary/40 rounded-lg p-5 text-center flex flex-col justify-center hover:bg-primary/5 transition-colors">
          <div className="font-heading text-2xl font-bold text-primary">+</div>
          <div className="text-xs text-text-muted tracking-[2px] uppercase mt-1 font-mono">Server Nou</div>
        </Link>
      </div>

      {/* SERVERS */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h3 className="font-heading text-xl font-bold mb-4">Serverele Mele</h3>
        {servers.length === 0 ? (
          <div className="text-center py-10 text-text-muted text-sm">
            Nu ai servere încă. <Link to="/boost" search={{ pkg: "" }} className="text-primary hover:underline">Adaugă primul!</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[0.68rem] font-mono uppercase tracking-[2px] text-text-muted py-2">Server</th>
                  <th className="text-left text-[0.68rem] font-mono uppercase tracking-[2px] text-text-muted py-2">Pachet</th>
                  <th className="text-left text-[0.68rem] font-mono uppercase tracking-[2px] text-text-muted py-2">Status</th>
                  <th className="text-left text-[0.68rem] font-mono uppercase tracking-[2px] text-text-muted py-2">Expiră</th>
                  <th className="text-left text-[0.68rem] font-mono uppercase tracking-[2px] text-text-muted py-2"></th>
                </tr>
              </thead>
              <tbody>
                {servers.map((s) => (
                  <tr key={s.id} className="border-b border-border/40">
                    <td className="py-3">
                      <div className="font-semibold text-sm">{s.name}</div>
                      <div className="font-mono text-xs text-text-muted">{s.ip}:{s.port}</div>
                    </td>
                    <td className="py-3">
                      <span
                        className="inline-flex px-2 py-0.5 rounded font-heading text-xs font-bold uppercase tracking-wider"
                        style={{
                          color: s.packages?.color ?? "#3b82f6",
                          background: `${s.packages?.color ?? "#3b82f6"}22`,
                          border: `1px solid ${s.packages?.color ?? "#3b82f6"}44`,
                        }}
                      >
                        {s.packages?.name ?? "—"}
                      </span>
                    </td>
                    <td className="py-3"><StatusBadge status={s.status} /></td>
                    <td className="py-3"><Countdown expiresAt={s.expires_at} /></td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => deleteServer(s.id)}
                        className="text-destructive/70 hover:text-destructive text-xs font-heading uppercase tracking-wider"
                      >
                        Șterge
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ORDERS */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-heading text-xl font-bold mb-4">Istoric Comenzi</h3>
        {orders.length === 0 ? (
          <div className="text-center py-10 text-text-muted text-sm">Nicio comandă încă.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[0.68rem] font-mono uppercase tracking-[2px] text-text-muted py-2">Nr.</th>
                  <th className="text-left text-[0.68rem] font-mono uppercase tracking-[2px] text-text-muted py-2">Pachet</th>
                  <th className="text-left text-[0.68rem] font-mono uppercase tracking-[2px] text-text-muted py-2">Sumă</th>
                  <th className="text-left text-[0.68rem] font-mono uppercase tracking-[2px] text-text-muted py-2">Metodă</th>
                  <th className="text-left text-[0.68rem] font-mono uppercase tracking-[2px] text-text-muted py-2">Status</th>
                  <th className="text-left text-[0.68rem] font-mono uppercase tracking-[2px] text-text-muted py-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-border/40">
                    <td className="py-3 font-mono text-xs text-primary">{o.order_number}</td>
                    <td className="py-3 text-sm">{o.packages?.name ?? "—"}</td>
                    <td className="py-3 font-mono text-sm">€{Number(o.amount).toFixed(0)}</td>
                    <td className="py-3 text-xs text-text-dim capitalize">{o.payment_method}</td>
                    <td className="py-3"><StatusBadge status={o.status} /></td>
                    <td className="py-3 text-xs text-text-muted">{new Date(o.created_at).toLocaleDateString("ro-RO")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 text-center">
      <div className="font-heading text-3xl font-bold leading-none">{value}</div>
      <div className="text-xs text-text-muted tracking-[2px] uppercase mt-2 font-mono">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    active: { cls: "bg-success/15 text-success border-success/30", label: "✓ Activ" },
    paid: { cls: "bg-success/15 text-success border-success/30", label: "✓ Plătit" },
    pending: { cls: "bg-warning/15 text-warning border-warning/30", label: "⏳ Așteptare" },
    expired: { cls: "bg-destructive/10 text-destructive border-destructive/30", label: "✗ Expirat" },
    failed: { cls: "bg-destructive/10 text-destructive border-destructive/30", label: "✗ Eșuat" },
    cancelled: { cls: "bg-muted text-text-muted border-border", label: "Anulat" },
  };
  const s = map[status] ?? { cls: "bg-muted text-text-muted border-border", label: status };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[0.7rem] uppercase tracking-wider border ${s.cls}`}>
      {s.label}
    </span>
  );
}
