import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { queryGameTracker } from "@/utils/gametracker.functions";
import { SectionHeader } from "@/components/SectionHeader";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/servers")({
  head: () => ({
    meta: [
      { title: "Listă Servere CS 1.6 — Cs16Radar" },
      {
        name: "description",
        content:
          "Listează gratuit serverul tău de Counter-Strike 1.6. Vezi toate serverele active din comunitate, jucători live și hărți curente.",
      },
      { property: "og:title", content: "Listă Servere CS 1.6 — Cs16Radar" },
      {
        property: "og:description",
        content:
          "Listare gratuită și permanentă pentru serverele tale CS 1.6. Date live actualizate automat.",
      },
    ],
  }),
  component: ServersPage,
});

interface ListedServer {
  id: string;
  ip: string;
  port: number;
  hostname: string | null;
  current_map: string | null;
  players_current: number;
  players_max: number;
  game_mod: string | null;
}

function ServersPage() {
  const [list, setList] = useState<ListedServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    const { data } = await supabase
      .from("listed_servers")
      .select("id,ip,port,hostname,current_map,players_current,players_max,game_mod")
      .eq("approved", true)
      .order("players_current", { ascending: false });
    setList((data as ListedServer[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("listed_servers_public")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listed_servers" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const filtered = list.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.hostname ?? "").toLowerCase().includes(q) ||
      s.ip.includes(q) ||
      (s.current_map ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <section className="py-12 px-4 max-w-7xl mx-auto">
      <SectionHeader
        label="// Listing comunitate"
        title="Servere CS 1.6"
        subtitle="Adaugă-ți serverul gratuit și permanent. Hostname, hartă și jucători se completează automat."
      />

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 mt-8">
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔎 caută server, IP sau hartă..."
              className="flex-1 bg-bg-deep border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <span className="font-mono text-xs text-text-muted whitespace-nowrap">
              {filtered.length} servere
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-text-muted">Se încarcă...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              Nu există servere listate încă. Fii primul!
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((s, i) => (
                <ServerRow key={s.id} server={s} rank={i + 1} />
              ))}
            </div>
          )}
        </div>

        <SubmitForm onSubmitted={load} />
      </div>
    </section>
  );
}

function ServerRow({ server, rank }: { server: ListedServer; rank: number }) {
  const fillPct = server.players_max
    ? Math.min(100, Math.round((server.players_current / server.players_max) * 100))
    : 0;
  const connectUrl = `steam://connect/${server.ip}:${server.port}`;

  return (
    <div className="grid grid-cols-[40px_1fr_auto_auto] items-center gap-3 p-3 rounded border border-border/50 bg-bg-deep/40 hover:border-primary/40 transition-colors">
      <div className="font-heading text-text-dim text-sm tabular-nums">#{rank}</div>
      <div className="min-w-0">
        <div className="font-semibold truncate">
          {server.hostname || `${server.ip}:${server.port}`}
        </div>
        <div className="font-mono text-xs text-text-muted">
          {server.ip}:{server.port} • {server.current_map || "—"}
          {server.game_mod ? ` • ${server.game_mod}` : ""}
        </div>
      </div>
      <div className="hidden sm:flex flex-col items-end min-w-[80px]">
        <span className="font-mono text-xs text-success">
          {server.players_current}/{server.players_max || "?"}
        </span>
        <div className="h-1 w-20 bg-border rounded mt-1 overflow-hidden">
          <div className="h-full bg-success" style={{ width: `${fillPct}%` }} />
        </div>
      </div>
      <div className="flex gap-2">
        <a
          href={connectUrl}
          className="font-heading text-xs uppercase tracking-wider px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90"
        >
          ▶ Conectează
        </a>
      </div>
    </div>
  );
}

function SubmitForm({ onSubmitted }: { onSubmitted: () => void }) {
  const { user } = useAuth();
  const queryFn = useServerFn(queryGameTracker);
  const [ip, setIp] = useState("");
  const [port, setPort] = useState(27015);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip.trim())) {
      toast.error("IP invalid (format: 1.2.3.4)");
      return;
    }
    if (port < 1 || port > 65535) {
      toast.error("Port invalid");
      return;
    }
    if (!user && !email.trim()) {
      toast.error("Email opțional, dar recomandat dacă nu ai cont");
    }
    setBusy(true);
    try {
      const info = await queryFn({ data: { ip: ip.trim(), port } });
      const { error } = await supabase.from("listed_servers").insert({
        ip: ip.trim(),
        port,
        hostname: info.hostname,
        current_map: info.current_map,
        players_current: info.players_current,
        players_max: info.players_max || 32,
        game_mod: info.game_mod,
        submitted_by_email: user?.email ?? email.trim() ?? null,
        submitted_by_user_id: user?.id ?? null,
        last_queried_at: new Date().toISOString(),
        query_failed: !info.online,
      });
      if (error) throw error;

      if (info.online) {
        toast.success(
          `Server detectat: ${info.hostname ?? ip}. Așteaptă aprobare admin.`,
        );
      } else {
        toast.success("Server trimis. Datele live nu au fost detectate, admin-ul va verifica.");
      }
      setIp("");
      setPort(27015);
      setEmail("");
      onSubmitted();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Eroare necunoscută";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        toast.error("Acest IP:port este deja listat sau în așteptare.");
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-card border border-border rounded-lg p-5 h-fit lg:sticky lg:top-4"
    >
      <div className="font-heading text-lg font-bold mb-1">+ Adaugă server</div>
      <div className="text-xs text-text-muted mb-4">
        Gratuit, permanent. Hostname / hartă / jucători se preiau automat din rețea.
      </div>

      <Field label="IP server">
        <input
          required
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          placeholder="89.40.244.1"
          className="w-full bg-bg-deep border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
        />
      </Field>

      <Field label="Port">
        <input
          type="number"
          required
          value={port}
          onChange={(e) => setPort(Number(e.target.value))}
          className="w-full bg-bg-deep border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
        />
      </Field>

      {!user && (
        <Field label="Email contact (opțional)">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplu.ro"
            className="w-full bg-bg-deep border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </Field>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-bold text-sm uppercase tracking-wider px-4 py-3 rounded transition-all disabled:opacity-50"
      >
        {busy ? "Se verifică serverul..." : "Trimite spre aprobare"}
      </button>

      <div className="mt-4 text-[0.7rem] text-text-muted leading-relaxed">
        ℹ️ Listarea e gratuită și nu are legătură cu pachetele de boost. După aprobare,
        serverul tău apare aici și pe pagina principală.{" "}
        <Link to="/packages" className="text-primary hover:underline">
          Vrei mai multă vizibilitate? Vezi pachetele de boost →
        </Link>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <div className="font-mono text-[0.65rem] uppercase tracking-wider text-text-muted mb-1">
        {label}
      </div>
      {children}
    </label>
  );
}
