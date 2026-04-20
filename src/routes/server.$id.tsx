import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Countdown } from "@/components/Countdown";

export const Route = createFileRoute("/server/$id")({
  component: ServerDetailPage,
  head: ({ params }) => ({
    meta: [
      { title: `Server ${params.id.slice(0, 8)} — Cs16Radar` },
      { name: "description", content: "Detalii server CS 1.6 listat: status live, jucători, hartă curentă și conexiune Steam." },
      { property: "og:title", content: "Server CS 1.6 — Cs16Radar" },
      { property: "og:description", content: "Conectează-te direct la serverul listat pe Cs16Radar." },
    ],
  }),
});

interface ServerDetail {
  id: string;
  name: string;
  hostname: string | null;
  ip: string;
  port: number;
  players_current: number;
  players_max: number;
  current_map: string | null;
  status: string;
  expires_at: string | null;
  activated_at: string | null;
  packages: { name: string; color: string; slug: string } | null;
}

function ServerDetailPage() {
  const { id } = Route.useParams();
  const [server, setServer] = useState<ServerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("servers")
        .select("id,name,hostname,ip,port,players_current,players_max,current_map,status,expires_at,activated_at,packages(name,color,slug)")
        .eq("id", id)
        .eq("status", "active")
        .maybeSingle();
      setServer((data as unknown as ServerDetail) ?? null);
      setLoading(false);
    }
    load();

    // Realtime updates for player count + map changes
    const channel = supabase
      .channel(`server-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "servers", filter: `id=eq.${id}` },
        (payload) => {
          setServer((prev) => (prev ? { ...prev, ...(payload.new as Partial<ServerDetail>) } : prev));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  function copyAddress() {
    if (!server) return;
    navigator.clipboard.writeText(`${server.ip}:${server.port}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="font-mono text-sm text-text-muted">Se încarcă serverul...</div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="font-heading text-3xl font-bold mb-3">Server inexistent</div>
        <p className="text-text-dim mb-6">Serverul nu există sau nu este activ în acest moment.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-bold text-sm uppercase tracking-wider px-6 py-2.5 rounded transition-all"
        >
          Înapoi la listă
        </Link>
      </div>
    );
  }

  const packageColor = server.packages?.color ?? "#3b82f6";
  const fillPct = server.players_max > 0 ? Math.min(100, (server.players_current / server.players_max) * 100) : 0;

  return (
    <div className="px-4 py-10 md:py-16 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6 font-mono text-xs text-text-muted">
        <Link to="/" className="hover:text-primary transition-colors">/ acasă</Link>
        <span className="mx-2">→</span>
        <span className="text-foreground">/ server / {server.id.slice(0, 8)}</span>
      </div>

      {/* Header card */}
      <div
        className="bg-card border border-border rounded-lg p-6 md:p-8 mb-6 relative overflow-hidden"
        style={{ boxShadow: `0 0 40px -12px ${packageColor}33` }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: packageColor, boxShadow: `0 0 12px ${packageColor}` }}
        />

        <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse-dot" style={{ boxShadow: "0 0 8px hsl(var(--success))" }} />
              <span className="font-mono text-xs text-success tracking-[2px] uppercase">ONLINE</span>
              {server.packages && (
                <span
                  className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded font-heading text-xs font-bold tracking-wider uppercase"
                  style={{
                    color: packageColor,
                    background: `${packageColor}22`,
                    border: `1px solid ${packageColor}55`,
                  }}
                >
                  {server.packages.name}
                </span>
              )}
            </div>
            <h1 className="font-heading text-2xl md:text-4xl font-bold leading-tight">
              {server.hostname || server.name}
            </h1>
            {server.hostname && server.hostname !== server.name && (
              <div className="text-sm text-text-muted mt-1">{server.name}</div>
            )}
          </div>
        </div>

        {/* Connect block */}
        <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-stretch mt-6">
          <div className="bg-bg-deep border border-border rounded px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[0.65rem] text-text-muted tracking-[2px] uppercase mb-0.5">Adresă server</div>
              <div className="font-mono text-base md:text-lg text-foreground break-all">{server.ip}:{server.port}</div>
            </div>
            <button
              onClick={copyAddress}
              className="shrink-0 px-3 py-1.5 text-xs font-heading font-semibold uppercase tracking-wider rounded border border-border text-text-dim hover:text-foreground hover:border-primary/40 hover:bg-primary/10 transition-all"
              title="Copiază adresa"
            >
              {copied ? "✓ COPIAT" : "📋 COPIAZĂ"}
            </button>
          </div>
          <a
            href={`steam://connect/${server.ip}:${server.port}`}
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-bold text-sm uppercase tracking-wider px-7 py-3 rounded transition-all hover:-translate-y-0.5"
            style={{ boxShadow: "var(--shadow-button)" }}
          >
            🎮 Conectează-te
          </a>
        </div>
        <p className="mt-2 font-mono text-[0.65rem] text-text-muted">
          ▸ Butonul deschide CS 1.6 prin Steam (steam://connect)
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {/* Players card */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="font-mono text-[0.65rem] text-text-muted tracking-[2px] uppercase mb-2">Jucători live</div>
          <div className="flex items-baseline gap-2 mb-3">
            <div className="font-heading text-4xl font-bold text-success leading-none">{server.players_current}</div>
            <div className="font-mono text-sm text-text-muted">/ {server.players_max}</div>
          </div>
          <div className="h-2 bg-bg-deep rounded-full overflow-hidden border border-border">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${fillPct}%`,
                background: "linear-gradient(90deg, hsl(var(--success)), var(--primary))",
              }}
            />
          </div>
          <div className="font-mono text-[0.65rem] text-text-muted mt-2">
            {fillPct.toFixed(0)}% capacitate
          </div>
        </div>

        {/* Current map card */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="font-mono text-[0.65rem] text-text-muted tracking-[2px] uppercase mb-2">Hartă curentă</div>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded flex items-center justify-center text-2xl"
              style={{ background: `${packageColor}22`, border: `1px solid ${packageColor}44` }}
            >
              🗺️
            </div>
            <div className="font-mono text-xl text-foreground">{server.current_map || "de_dust2"}</div>
          </div>
          <div className="font-mono text-[0.65rem] text-text-muted">
            ▸ Modificată la fiecare schimbare de hartă
          </div>
        </div>

        {/* Expires card */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="font-mono text-[0.65rem] text-text-muted tracking-[2px] uppercase mb-2">Boost expiră în</div>
          <div className="text-2xl">
            <Countdown expiresAt={server.expires_at} />
          </div>
        </div>

        {/* Activated card */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="font-mono text-[0.65rem] text-text-muted tracking-[2px] uppercase mb-2">Activat la</div>
          <div className="font-mono text-sm text-foreground">
            {server.activated_at
              ? new Date(server.activated_at).toLocaleDateString("ro-RO", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-text-dim hover:text-foreground font-heading text-sm uppercase tracking-wider transition-colors"
        >
          ← Înapoi la listă
        </Link>
        <Link
          to="/boost"
          className="inline-flex items-center gap-2 bg-transparent border border-border text-text-dim hover:text-foreground hover:border-primary/40 hover:bg-primary/10 font-heading font-semibold text-sm uppercase tracking-wider px-5 py-2 rounded transition-all"
        >
          🚀 Boost-ează și tu
        </Link>
      </div>
    </div>
  );
}
