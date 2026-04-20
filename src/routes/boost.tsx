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
        } else if (pkgs.length > 0) {
          // Default to FREE if no preselection
          const free = pkgs.find((p) => p.slug === "free" || Number(p.price) === 0);
          setPackageId(free?.id ?? pkgs[0].id);
        }
      });
  }, [search.pkg]);

  const selectedPkg = packages.find((p) => p.id === packageId);
  const isFree = selectedPkg ? Number(selectedPkg.price) === 0 : false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !packageId || !selectedPkg) return;

    setSubmitting(true);

    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
      toast.error("IP invalid (format: x.x.x.x)");
      setSubmitting(false);
      return;
    }

    const portNum = parseInt(port, 10);
    if (!portNum || portNum < 1 || portNum > 65535) {
      toast.error("Port invalid (1-65535)");
      setSubmitting(false);
      return;
    }

    // FREE flow → create server already active, no order
    if (isFree) {
      const expires = selectedPkg.duration_days
        ? new Date(Date.now() + selectedPkg.duration_days * 86400 * 1000).toISOString()
        : null;

      const { error: serverErr } = await supabase
        .from("servers")
        .insert({
          user_id: user.id,
          package_id: packageId,
          name: name || `${ip}:${portNum}`,
          ip,
          port: portNum,
          status: "active",
          activated_at: new Date().toISOString(),
          expires_at: expires,
        });

      if (serverErr) {
        toast.error(serverErr.message);
        setSubmitting(false);
        return;
      }

      toast.success("Server adăugat gratuit! Apare în listă imediat.");
      setTimeout(() => navigate({ to: "/dashboard" }), 1000);
      return;
    }

    // PAID flow → pending server + pending order
    const { data: server, error: serverErr } = await supabase
      .from("servers")
      .insert({
        user_id: user.id,
        package_id: packageId,
        name: name || `${ip}:${portNum}`,
        ip,
        port: portNum,
        status: "pending",
      })
      .select()
      .single();

    if (serverErr) {
      toast.error(serverErr.message);
      setSubmitting(false);
      return;
    }

    const { error: orderErr } = await supabase.from("orders").insert({
      user_id: user.id,
      server_id: server.id,
      package_id: selectedPkg.id,
      amount: selectedPkg.price,
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
      <SectionHeader label="// Adaugă server" title="Listează Serverul Tău" />

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
                {p.name} — {Number(p.price) === 0 ? "GRATUIT" : `€${p.price}`} ({p.duration_days ? `${p.duration_days} zile` : "PERMANENT"})
              </option>
            ))}
          </select>
        </div>

        {!isFree && (
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
        )}

        <div className={`border text-sm p-3 rounded flex items-start gap-2 ${
          isFree ? "bg-success/10 border-success/30 text-success" : "bg-primary/10 border-primary/30 text-primary"
        }`}>
          <span>{isFree ? "✅" : "ℹ️"}</span>
          <span>
            {isFree
              ? "Pachet GRATUIT — serverul tău apare imediat în listă, fără plată."
              : "Activarea prin PayPal este instantă. Transfer/Revolut necesită confirmare manuală (max 2h)."}
          </span>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-heading font-bold text-sm uppercase tracking-wider py-3.5 rounded transition-all"
          style={{ boxShadow: "var(--shadow-button)" }}
        >
          {submitting ? "..." : isFree ? "✅ Adaugă Gratuit" : "🚀 Trimite Comanda"}
        </button>
      </form>
    </section>
  );
}
