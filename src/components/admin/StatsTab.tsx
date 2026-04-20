import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function StatsTab() {
  const [stats, setStats] = useState({
    activeServers: 0,
    pendingServers: 0,
    users: 0,
    totalRevenue: 0,
    monthRevenue: 0,
    todayOrders: 0,
    totalServers: 0,
    paidOrders: 0,
  });

  useEffect(() => {
    (async () => {
      const [active, pending, total, users, allOrders] = await Promise.all([
        supabase.from("servers").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("servers").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("servers").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("amount,status,created_at"),
      ]);

      const orders = allOrders.data ?? [];
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

      setStats({
        activeServers: active.count ?? 0,
        pendingServers: pending.count ?? 0,
        totalServers: total.count ?? 0,
        users: users.count ?? 0,
        paidOrders: orders.filter((o) => o.status === "paid").length,
        totalRevenue: orders.filter((o) => o.status === "paid").reduce((a, o) => a + Number(o.amount), 0),
        monthRevenue: orders.filter((o) => o.status === "paid" && new Date(o.created_at) >= monthStart).reduce((a, o) => a + Number(o.amount), 0),
        todayOrders: orders.filter((o) => new Date(o.created_at) >= todayStart).length,
      });
    })();
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard icon="🟢" value={stats.activeServers} label="Servere Active" />
      <StatCard icon="⏳" value={stats.pendingServers} label="În Așteptare" />
      <StatCard icon="🖥️" value={stats.totalServers} label="Total Servere" />
      <StatCard icon="👤" value={stats.users} label="Utilizatori" />
      <StatCard icon="💰" value={`€${stats.monthRevenue.toFixed(0)}`} label="Venituri Lună" />
      <StatCard icon="📊" value={`€${stats.totalRevenue.toFixed(0)}`} label="Total Venituri" />
      <StatCard icon="✅" value={stats.paidOrders} label="Comenzi Plătite" />
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
