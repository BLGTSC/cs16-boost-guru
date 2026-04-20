import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader } from "@/components/SectionHeader";
import { StatsTab } from "@/components/admin/StatsTab";
import { ServersTab } from "@/components/admin/ServersTab";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { PackagesTab } from "@/components/admin/PackagesTab";
import { ContentTab } from "@/components/admin/ContentTab";
import { ListingsTab } from "@/components/admin/ListingsTab";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    }
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

type Tab = "stats" | "servers" | "listings" | "orders" | "users" | "packages" | "content";

const TABS: Array<[Tab, string]> = [
  ["stats", "📊 Statistici"],
  ["servers", "🖥️ Servere Boost"],
  ["listings", "📡 Listări Free"],
  ["orders", "🛒 Comenzi"],
  ["users", "👤 Utilizatori"],
  ["packages", "📦 Pachete"],
  ["content", "📝 Conținut Site"],
];

function AdminPage() {
  const [tab, setTab] = useState<Tab>("stats");

  return (
    <section className="py-12 px-4 max-w-7xl mx-auto">
      <SectionHeader label="// Panou administrare" title="Admin Dashboard" />

      <div className="flex gap-2 flex-wrap mb-8">
        {TABS.map(([id, label]) => (
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
      {tab === "listings" && <ListingsTab />}
      {tab === "orders" && <OrdersTab />}
      {tab === "users" && <UsersTab />}
      {tab === "packages" && <PackagesTab />}
      {tab === "content" && <ContentTab />}
    </section>
  );
}
