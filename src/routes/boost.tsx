import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/boost")({
  validateSearch: (search: Record<string, unknown>) => ({
    pkg: (search.pkg as string) || "",
  }),
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    }
  },
  component: BoostPage,
});

interface PackageRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  duration_days: number | null;
}

const PAYMENT_OPTIONS = [
  { id: "paypal", icon: "💳", name: "PayPal", note: "Instant" },
  { id: "transfer", icon: "🏦", name: "Transfer", note: "Manual" },
  { id: "revolut", icon: "📱", name: "Revolut", note: "Manual" },
] as const;

function BoostPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [port, setPort] = useState("27015");
  const [packageId, setPackageId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"paypal" | "transfer" | "revolut">("paypal");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("packages").select("id,name,slug,price,duration_days").eq("active", true).order("sort_order")
      .then(({ data }) => {
        const pkgs = (data as PackageRow[]) ?? [];
        setPackages(pkgs);
        if (search.pkg) {
          const found = pkgs.find((p) => p.slug === search.pkg);
          if (found) setPackageId(found.id);
        }
      });
  }, [search.pkg]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !packageId) return;

    setSubmitting(true);
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) {
      toast.error("Pachet invalid");
      setSubmitting(false);
      return;
    }

    // Validate IP format (basic)
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
      toast.error("IP invalid (format: x.x.x.x)");
      setSubmitting(false);
      return;
    }

    // Create server (pending)
    const { data: server, error: serverErr } = await supabase
      .from("servers")
      .insert({
        user_id: user.id,
        package_id: packageId,
        name: name || `${ip}:${port}`,
        ip,
        port: parseInt(port, 10),
        status: "pending",
      })
      .select()
      .single();

    if (serverErr) {
      toast.error(serverErr.message);
      setSubmitting(false);
      return;
    }

    // Create order
    const { error: orderErr } = await supabase.from("orders").insert({
      user_id: user.id,
      server_id: server.id,
      package_id: pkg.id,
      amount: pkg.price,
      payment_method: paymentMethod,
      status: "pending",
      customer_email: user.email,
    });

    if (orderErr) {
      toast.error(orderErr.message);
      setSubmitting(false);
      return;
    }

    toast.success("Comandă înregistrată! Vei fi contactat pentru plată.");
    setTimeout(() => navigate({ to: "/dashboard" }), 1200);
  }

  return (
    <section className="py-12 px-4 max-w-2xl mx-auto">
      <SectionHeader label="// Boost nou" title="Adaugă Serverul Tău" />

      <form
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-lg p-7 space-y-5"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div>
          <label className="block font-mono text-xs tracking-wider uppercase text-text-dim mb-2">Nume Server *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex. CS.LEAGUECS.RO # Public"
            className="w-full bg-bg-deep border border-border rounded px-4 py-2.5 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block font-mono text-xs tracking-wider uppercase text-text-dim mb-2">IP Server *</label>
            <input
              type="text"
              required
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="81.181.244.13"
              className="w-full bg-bg-deep border border-border rounded px-4 py-2.5 font-mono text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block font-mono text-xs tracking-wider uppercase text-text-dim mb-2">Port *</label>
            <input
              type="number"
              required
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="w-full bg-bg-deep border border-border rounded px-4 py-2.5 font-mono text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div>
          <label className="block font-mono text-xs tracking-wider uppercase text-text-dim mb-2">Pachet *</label>
          <select
            required
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            className="w-full bg-bg-deep border border-border rounded px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
          >
            <option value="">— Selectează pachet —</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — €{p.price} ({p.duration_days ? `${p.duration_days} zile` : "PERMANENT"})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-mono text-xs tracking-wider uppercase text-text-dim mb-2">Metodă Plată *</label>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_OPTIONS.map((opt) => {
              const active = paymentMethod === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setPaymentMethod(opt.id)}
                  className={`border rounded p-3 text-center transition-all ${
                    active ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="text-xl mb-1">{opt.icon}</div>
                  <div className="font-heading font-bold text-sm">{opt.name}</div>
                  <div className="font-mono text-[0.65rem] text-text-muted">{opt.note}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-primary/10 border border-primary/30 text-primary text-sm p-3 rounded flex items-start gap-2">
          <span>ℹ️</span>
          <span>
            Activarea prin PayPal este instantă. Transfer/Revolut necesită confirmare manuală (max 2h în zilele lucrătoare).
          </span>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-heading font-bold text-sm uppercase tracking-wider py-3.5 rounded transition-all"
          style={{ boxShadow: "var(--shadow-button)" }}
        >
          {submitting ? "..." : "🚀 Trimite Comanda"}
        </button>
      </form>
    </section>
  );
}
