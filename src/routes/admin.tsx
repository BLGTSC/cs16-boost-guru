import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader } from "@/components/SectionHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    }
    // Server-side admin check
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roles) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminPage,
});

type Tab = "stats" | "servers" | "orders" | "users" | "packages";

function AdminPage() {
  const [tab, setTab] = useState<Tab>("stats");

  return (
    <section className="py-12 px-4 max-w-7xl mx-auto">
      <SectionHeader label="// Panou administrare" title="Admin Dashboard" />

      <div className="flex gap-2 flex-wrap mb-8">
        {([
          ["stats", "📊 Statistici"],
          ["servers", "🖥️ Servere"],
          ["orders", "🛒 Comenzi"],
          ["users", "👤 Utilizatori"],
          ["packages", "📦 Pachete"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`font-heading text-sm font-semibold uppercase tracking-wider px-4 py-2 rounded border transition-all ${
              tab === id
                ? "bg-primary/15 border-primary/50 text-foreground"
                : "border-border text-text-dim hover:text-foreground hover:border-primary/30"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "stats" && <StatsTab />}
      {tab === "servers" && <ServersTab />}
      {tab === "orders" && <OrdersTab />}
      {tab === "users" && <UsersTab />}
      {tab === "packages" && <PackagesTab />}
    </section>
  );
}

// ============== STATS ==============
function StatsTab() {
  const [stats, setStats] = useState({
    activeServers: 0,
    pendingServers: 0,
    users: 0,
    totalRevenue: 0,
    monthRevenue: 0,
    todayOrders: 0,
  });

  useEffect(() => {
    (async () => {
      const [active, pending, users, allOrders] = await Promise.all([
        supabase.from("servers").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("servers").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("amount,status,created_at"),
      ]);

      const orders = allOrders.data ?? [];
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

      setStats({
        activeServers: active.count ?? 0,
        pendingServers: pending.count ?? 0,
        users: users.count ?? 0,
        totalRevenue: orders.filter((o) => o.status === "paid").reduce((a, o) => a + Number(o.amount), 0),
        monthRevenue: orders.filter((o) => o.status === "paid" && new Date(o.created_at) >= monthStart).reduce((a, o) => a + Number(o.amount), 0),
        todayOrders: orders.filter((o) => new Date(o.created_at) >= todayStart).length,
      });
    })();
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard icon="🟢" value={stats.activeServers} label="Servere Active" />
      <StatCard icon="⏳" value={stats.pendingServers} label="În Așteptare" />
      <StatCard icon="👤" value={stats.users} label="Utilizatori" />
      <StatCard icon="💰" value={`€${stats.monthRevenue.toFixed(0)}`} label="Venituri Lună" />
      <StatCard icon="📊" value={`€${stats.totalRevenue.toFixed(0)}`} label="Total Venituri" />
      <StatCard icon="🛒" value={stats.todayOrders} label="Comenzi Azi" />
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="font-heading text-2xl font-bold text-primary leading-none">{value}</div>
      <div className="text-[0.68rem] text-text-muted tracking-[1.5px] uppercase mt-1.5 font-mono">{label}</div>
    </div>
  );
}

// ============== SERVERS ==============
interface AdminServer {
  id: string;
  name: string;
  ip: string;
  port: number;
  status: string;
  expires_at: string | null;
  packages: { name: string; color: string } | null;
  profiles: { display_name: string | null; email: string | null } | null;
}

function ServersTab() {
  const [servers, setServers] = useState<AdminServer[]>([]);
  const [filter, setFilter] = useState<string>("all");

  async function load() {
    let q = supabase.from("servers").select("id,name,ip,port,status,expires_at,packages(name,color),profiles!servers_user_id_fkey(display_name,email)");
    if (filter !== "all") q = q.eq("status", filter as "active" | "pending" | "expired" | "suspended");
    const { data } = await q.order("created_at", { ascending: false });
    setServers((data as unknown as AdminServer[]) ?? []);
  }

  useEffect(() => { load(); }, [filter]);

  async function activate(id: string) {
    const { error } = await supabase.from("servers").update({
      status: "active",
      activated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Server activat");
    load();
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-bg-deep border border-border rounded px-3 py-1.5 text-sm">
          <option value="all">Toate</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="expired">Expirate</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <Th>Server</Th><Th>Utilizator</Th><Th>Pachet</Th><Th>Status</Th><Th>Acțiuni</Th>
            </tr>
          </thead>
          <tbody>
            {servers.map((s) => (
              <tr key={s.id} className="border-b border-border/40">
                <td className="py-3"><div className="font-semibold text-sm">{s.name}</div><div className="font-mono text-xs text-text-muted">{s.ip}:{s.port}</div></td>
                <td className="py-3 text-sm">{s.profiles?.display_name ?? s.profiles?.email ?? "—"}</td>
                <td className="py-3 text-sm">{s.packages?.name ?? "—"}</td>
                <td className="py-3 text-xs uppercase font-mono">{s.status}</td>
                <td className="py-3">
                  {s.status === "pending" && (
                    <button onClick={() => activate(s.id)} className="text-success hover:underline text-xs font-heading uppercase">✓ Activează</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============== ORDERS ==============
interface AdminOrder {
  id: string;
  order_number: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  packages: { name: string } | null;
  profiles: { display_name: string | null; email: string | null } | null;
}

function OrdersTab() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);

  async function load() {
    const { data } = await supabase
      .from("orders")
      .select("id,order_number,amount,payment_method,status,created_at,packages(name),profiles!orders_user_id_fkey(display_name,email)")
      .order("created_at", { ascending: false });
    setOrders((data as unknown as AdminOrder[]) ?? []);
  }

  useEffect(() => { load(); }, []);

  async function markPaid(id: string) {
    const { error } = await supabase.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marcat ca plătit");
    load();
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <Th>Nr.</Th><Th>Utilizator</Th><Th>Pachet</Th><Th>Sumă</Th><Th>Metodă</Th><Th>Status</Th><Th>Acțiuni</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border/40">
                <td className="py-3 font-mono text-xs text-primary">{o.order_number}</td>
                <td className="py-3 text-sm">{o.profiles?.display_name ?? o.profiles?.email ?? "—"}</td>
                <td className="py-3 text-sm">{o.packages?.name ?? "—"}</td>
                <td className="py-3 font-mono">€{Number(o.amount).toFixed(0)}</td>
                <td className="py-3 text-xs capitalize">{o.payment_method}</td>
                <td className="py-3 text-xs uppercase font-mono">{o.status}</td>
                <td className="py-3">
                  {o.status === "pending" && (
                    <button onClick={() => markPaid(o.id)} className="text-success hover:underline text-xs font-heading uppercase">✓ Plătit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============== USERS ==============
interface AdminUser {
  id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());

  async function load() {
    const { data } = await supabase.from("profiles").select("id,display_name,email,created_at").order("created_at", { ascending: false });
    setUsers((data as AdminUser[]) ?? []);
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    setAdminIds(new Set((roles ?? []).map((r) => r.user_id)));
  }

  useEffect(() => { load(); }, []);

  async function toggleAdmin(userId: string, isAdmin: boolean) {
    if (isAdmin) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      toast.success("Rol admin eliminat");
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      toast.success("Rol admin acordat");
    }
    load();
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <Th>Nume</Th><Th>Email</Th><Th>Rol</Th><Th>Înregistrat</Th><Th>Acțiuni</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isAdmin = adminIds.has(u.id);
              return (
                <tr key={u.id} className="border-b border-border/40">
                  <td className="py-3 font-semibold text-sm">{u.display_name ?? "—"}</td>
                  <td className="py-3 text-sm text-text-dim">{u.email}</td>
                  <td className="py-3">
                    {isAdmin
                      ? <span className="text-warning font-mono text-xs uppercase">⭐ Admin</span>
                      : <span className="text-text-muted font-mono text-xs uppercase">User</span>}
                  </td>
                  <td className="py-3 text-xs text-text-muted">{new Date(u.created_at).toLocaleDateString("ro-RO")}</td>
                  <td className="py-3">
                    <button onClick={() => toggleAdmin(u.id, isAdmin)} className="text-primary hover:underline text-xs font-heading uppercase">
                      {isAdmin ? "Elimină admin" : "Fă admin"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============== PACKAGES ==============
interface AdminPkg { id: string; name: string; price: number; duration_days: number | null; max_slots: number; active: boolean; }

function PackagesTab() {
  const [pkgs, setPkgs] = useState<AdminPkg[]>([]);

  useEffect(() => {
    supabase.from("packages").select("id,name,price,duration_days,max_slots,active").order("sort_order")
      .then(({ data }) => setPkgs((data as AdminPkg[]) ?? []));
  }, []);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <Th>Nume</Th><Th>Preț</Th><Th>Durată</Th><Th>Sloturi</Th><Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {pkgs.map((p) => (
            <tr key={p.id} className="border-b border-border/40">
              <td className="py-3 font-heading font-bold">{p.name}</td>
              <td className="py-3 font-mono">€{p.price}</td>
              <td className="py-3 text-sm">{p.duration_days ? `${p.duration_days} zile` : "Permanent"}</td>
              <td className="py-3 font-mono text-sm">{p.max_slots}</td>
              <td className="py-3">
                <span className={`font-mono text-xs uppercase ${p.active ? "text-success" : "text-text-muted"}`}>
                  {p.active ? "Activ" : "Inactiv"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left text-[0.68rem] font-mono uppercase tracking-[2px] text-text-muted py-2">{children}</th>;
}
