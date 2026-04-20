import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PackageCard, type PackageItem } from "@/components/PackageCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Countdown } from "@/components/Countdown";
import { useSiteContent } from "@/hooks/useSiteContent";

export const Route = createFileRoute("/")({
  component: HomePage,
});

interface ServerRow {
  id: string;
  name: string;
  ip: string;
  port: number;
  players_current: number;
  players_max: number;
  expires_at: string | null;
  packages: { name: string; color: string; slug: string } | null;
}

function HomePage() {
  const { get } = useSiteContent();
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [servers, setServers] = useState<ServerRow[]>([]);

  useEffect(() => {
    supabase
      .from("packages")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => setPackages((data as PackageItem[]) ?? []));

    supabase
      .from("servers")
      .select("id,name,ip,port,players_current,players_max,expires_at,packages(name,color,slug)")
      .eq("status", "active")
      .order("players_current", { ascending: false })
      .limit(50)
      .then(({ data }) => setServers((data as unknown as ServerRow[]) ?? []));
  }, []);

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden px-4 py-16">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "var(--gradient-grid)",
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)",
          }}
        />
        <div className="relative text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary font-mono text-xs px-4 py-1.5 rounded tracking-[2px] uppercase mb-6 animate-fade-up">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" style={{ boxShadow: "0 0 6px hsl(var(--success))" }} />
            {get("hero_badge", "ONLINE • Platformă Activă 24/7")}
          </div>
          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold leading-[1] mb-5 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            {get("hero_title_1", "Boost-ează")}<br />
            {get("hero_title_2", "serverul tău")}<br />
            <span className="text-primary glow-text">{get("hero_title_3", "CS 1.6")}</span>
          </h1>
          <p className="text-lg text-text-dim mb-10 font-light animate-fade-up whitespace-pre-line" style={{ animationDelay: "0.2s" }}>
            {get("hero_subtitle", "Jucători reali, masterserver propriu, listare gratuită.")}
          </p>
          <div className="flex gap-4 justify-center flex-wrap animate-fade-up" style={{ animationDelay: "0.3s" }}>
            <Link
              to="/boost"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-bold text-sm uppercase tracking-wider px-7 py-3 rounded transition-all hover:-translate-y-0.5"
              style={{ boxShadow: "var(--shadow-button)" }}
            >
              {get("hero_cta_primary", "🚀 Adaugă Serverul Tău")}
            </Link>
            <Link
              to="/packages"
              className="inline-flex items-center gap-2 bg-transparent border border-border text-text-dim hover:text-foreground hover:border-primary/40 hover:bg-primary/10 font-heading font-semibold text-sm uppercase tracking-wider px-7 py-3 rounded transition-all"
            >
              {get("hero_cta_secondary", "👁 Vezi Pachetele")}
            </Link>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="bg-card border-y border-border py-6 px-4 flex justify-center gap-8 md:gap-16 flex-wrap">
        <div className="text-center">
          <div className="font-heading text-3xl md:text-4xl font-bold text-primary leading-none">{servers.length}</div>
          <div className="text-xs text-text-muted tracking-[2px] uppercase mt-1">Servere Active</div>
        </div>
        <div className="text-center">
          <div className="font-heading text-3xl md:text-4xl font-bold text-primary leading-none">
            {servers.reduce((acc, s) => acc + s.players_current, 0)}+
          </div>
          <div className="text-xs text-text-muted tracking-[2px] uppercase mt-1">Jucători Live</div>
        </div>
        <div className="text-center">
          <div className="font-heading text-3xl md:text-4xl font-bold text-primary leading-none">24/7</div>
          <div className="text-xs text-text-muted tracking-[2px] uppercase mt-1">Uptime Garantat</div>
        </div>
        <div className="text-center">
          <div className="font-heading text-3xl md:text-4xl font-bold text-primary leading-none">FREE</div>
          <div className="text-xs text-text-muted tracking-[2px] uppercase mt-1">Listare Gratuită</div>
        </div>
      </section>

      {/* SERVERS LIST */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <SectionHeader label="// Lista Servere" title="Servere în Radar" />
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="bg-primary/5 px-5 py-3 text-left font-mono text-[0.68rem] tracking-[2px] uppercase text-text-muted border-b border-border">Server</th>
                  <th className="bg-primary/5 px-5 py-3 text-left font-mono text-[0.68rem] tracking-[2px] uppercase text-text-muted border-b border-border">IP:Port</th>
                  <th className="bg-primary/5 px-5 py-3 text-left font-mono text-[0.68rem] tracking-[2px] uppercase text-text-muted border-b border-border">Pachet</th>
                  <th className="bg-primary/5 px-5 py-3 text-left font-mono text-[0.68rem] tracking-[2px] uppercase text-text-muted border-b border-border">Jucători</th>
                  <th className="bg-primary/5 px-5 py-3 text-left font-mono text-[0.68rem] tracking-[2px] uppercase text-text-muted border-b border-border">Expiră</th>
                </tr>
              </thead>
              <tbody>
                {servers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-text-muted text-sm">
                      Niciun server activ momentan. <Link to="/boost" className="text-primary hover:underline">Adaugă primul gratuit!</Link>
                    </td>
                  </tr>
                ) : (
                  servers.map((s) => (
                    <tr key={s.id} className="border-b border-border/40 last:border-b-0 hover:bg-bg-hover transition-colors">
                      <td className="px-5 py-3.5">
                        <Link
                          to="/server/$id"
                          params={{ id: s.id }}
                          className="font-semibold text-sm text-foreground hover:text-primary transition-colors"
                        >
                          {s.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-text-muted">{s.ip}:{s.port}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded font-heading text-xs font-bold tracking-wider uppercase"
                          style={{
                            color: s.packages?.color ?? "#3b82f6",
                            background: `${s.packages?.color ?? "#3b82f6"}22`,
                            border: `1px solid ${s.packages?.color ?? "#3b82f6"}44`,
                          }}
                        >
                          {s.packages?.name ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-sm text-success">
                        {s.players_current}/{s.players_max}
                      </td>
                      <td className="px-5 py-3.5"><Countdown expiresAt={s.expires_at} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <SectionHeader label="// Proces simplu" title="Cum funcționează?" align="center" />
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { n: "01", icon: "📦", title: "Alegi Pachetul", desc: "Listare gratuită sau boost premium. Tu decizi." },
            { n: "02", icon: "📝", title: "Adaugi Serverul", desc: "IP, port, nume — totul în 30 de secunde." },
            { n: "03", icon: "🚀", title: "Apare în Radar", desc: "Server vizibil instant pe Cs16Radar pentru toți." },
            { n: "04", icon: "📈", title: "Crești", desc: "Urmărești jucătorii live în dashboard. Reînnoiești oricând." },
          ].map((step) => (
            <div key={step.n} className="relative bg-card border border-border rounded-lg p-7 text-center">
              <div className="absolute top-3 right-4 font-heading text-6xl font-bold text-primary/10 leading-none">
                {step.n}
              </div>
              <div className="text-4xl mb-3">{step.icon}</div>
              <div className="font-heading text-lg font-bold mb-2">{step.title}</div>
              <div className="text-sm text-text-dim">{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PACKAGES */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <SectionHeader label="// Prețuri transparente" title="Alege Pachetul Tău" align="center" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages.map((p) => <PackageCard key={p.id} pkg={p} />)}
        </div>
      </section>
    </>
  );
}
