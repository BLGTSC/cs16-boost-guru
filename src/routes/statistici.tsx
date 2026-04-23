import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchRedirectStats, type StatsPayload, type ChartPoint } from "@/utils/stats.functions";

export const Route = createFileRoute("/statistici")({
  head: () => ({
    meta: [
      { title: "Statistici Live — Cs16Radar Redirect Network" },
      { name: "description", content: "Telemetrie live a rețelei de redirect Cs16Radar — total redirecționări, ranking VPS, activitate jucători în timp real." },
      { property: "og:title", content: "Statistici Live — Cs16Radar Redirect Network" },
      { property: "og:description", content: "Telemetrie live a rețelei de redirect Cs16Radar — total redirecționări, ranking VPS, activitate jucători în timp real." },
    ],
  }),
  component: StatsPage,
});

const EMPTY_STATS: StatsPayload = {
  totals: { allTime: 0, today: 0, lastHour: 0, nodes: 0 },
  lastSync: "",
  chart: { "7": [], "14": [], "30": [] },
  ranking: [],
  feed: [],
};

function StatsPage() {
  const [data, setData] = useState<StatsPayload>(EMPTY_STATS);
  const [range, setRange] = useState<"7" | "14" | "30">("7");
  const [refreshing, setRefreshing] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function pull() {
      try {
        const fresh = await fetchRedirectStats();
        if (!active) return;
        setData(fresh);
        setLoadError(null);
      } catch (err) {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : "Eroare necunoscută");
      } finally {
        if (active) setRefreshing(false);
      }
    }
    pull();
    const id = setInterval(pull, 30_000);
    return () => { active = false; clearInterval(id); };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated mesh background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.7 0.2 145) 0%, transparent 70%)" }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.65 0.25 270) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-1/2 w-[700px] h-[400px] rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.7 0.2 200) 0%, transparent 70%)" }} />
      </div>

      <section className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="mb-10 flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-success/30 bg-success/10 mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="font-mono text-[0.7rem] uppercase tracking-widest text-success">Live • Auto-refresh 30s</span>
              {refreshing && <span className="font-mono text-[0.65rem] text-text-muted">syncing…</span>}
            </div>
            <h1 className="font-heading text-4xl md:text-6xl font-bold tracking-tight">
              Redirect <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, oklch(0.75 0.2 145), oklch(0.7 0.25 200))" }}>Telemetry</span>
            </h1>
            <p className="text-text-dim mt-3 max-w-xl">
              Date live de la nodurile noastre VPS — fiecare jucător pe care îl redirecționăm spre serverele tale, în timp real.
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-[0.65rem] uppercase tracking-widest text-text-muted">Last sync</div>
            <div className="font-mono text-sm text-foreground">{data.lastSync}</div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="All-Time Redirects" value={data.totals.allTime} desc="Total înregistrate" hue={145} />
          <StatCard label="Today" value={data.totals.today} desc="Ultimele 24h" hue={220} />
          <StatCard label="Last Hour" value={data.totals.lastHour} desc="Ultimele 60 min" hue={280} />
          <StatCard label="VPS Nodes" value={data.totals.nodes} desc="Noduri active" hue={45} />
        </div>

        {/* Chart + ranking grid */}
        <div className="grid lg:grid-cols-3 gap-4 mb-8">
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-30 pointer-events-none"
              style={{ background: "radial-gradient(circle at 0% 0%, oklch(0.7 0.2 145 / 0.15), transparent 50%)" }} />
            <div className="relative flex items-start justify-between mb-6">
              <div>
                <div className="font-mono text-[0.65rem] uppercase tracking-widest text-success mb-1">// Traffic waveform</div>
                <h2 className="font-heading text-xl font-bold">Conexiuni per zi</h2>
              </div>
              <div className="flex gap-1 p-1 rounded-lg bg-bg-deep/50 border border-border">
                {(["7", "14", "30"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1 text-xs font-mono uppercase rounded transition-all ${
                      range === r ? "bg-success/20 text-success" : "text-text-dim hover:text-foreground"
                    }`}
                  >
                    {r}d
                  </button>
                ))}
              </div>
            </div>
            <BarChart points={data.chart[range] ?? []} />
          </div>

          <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-6 relative overflow-hidden">
            <div className="font-mono text-[0.65rem] uppercase tracking-widest text-success mb-1">// Node ranking</div>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="font-heading text-xl font-bold">VPS Nodes</h2>
              <span className="px-2 py-0.5 text-[0.65rem] font-mono uppercase rounded bg-success/15 text-success border border-success/30">
                {data.ranking.length} nodes
              </span>
            </div>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
              {data.ranking.map((n) => (
                <div key={n.rank} className="group">
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-text-muted w-5">{n.rank}</span>
                      <span className="w-2 h-2 rounded-full" style={{ background: n.color, boxShadow: `0 0 8px ${n.color}` }} />
                      <span className="font-mono text-foreground">{n.name}</span>
                    </div>
                    <div className="font-mono">
                      <span className="font-bold text-foreground">{n.total.toLocaleString()}</span>
                      <span className="text-text-muted"> / {n.today} azi</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-deep/80 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 group-hover:brightness-125"
                      style={{ width: `${n.pct}%`, background: `linear-gradient(90deg, ${n.color}, ${n.color}aa)`, boxShadow: `0 0 8px ${n.color}66` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live feed */}
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-6 relative overflow-hidden">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <div className="font-mono text-[0.65rem] uppercase tracking-widest text-success mb-1">// Live feed</div>
              <h2 className="font-heading text-xl font-bold">Activitate recentă</h2>
            </div>
            <span className="text-xs text-text-muted">ultimii {data.feed.length} jucători</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[0.65rem] font-mono uppercase tracking-widest text-text-muted border-b border-border">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">VPS</th>
                  <th className="py-2 pr-4">Jucător</th>
                  <th className="py-2 pr-4">IP</th>
                  <th className="py-2 pr-4">Timestamp</th>
                  <th className="py-2">Acum</th>
                </tr>
              </thead>
              <tbody>
                {data.feed.map((row) => (
                  <tr key={row.id} className="border-b border-border/30 hover:bg-primary/5 transition-colors">
                    <td className="py-2.5 pr-4 font-mono text-xs text-text-muted">{row.id}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className="inline-block px-2 py-0.5 text-[0.65rem] font-mono rounded border"
                        style={{ color: row.vpsColor, borderColor: `${row.vpsColor}55`, background: `${row.vpsColor}15` }}
                      >
                        {row.vps}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-foreground">{row.name}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-text-dim">{row.ip}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-text-muted">{row.ts}</td>
                    <td className="py-2.5 font-mono text-xs text-text-dim">{row.ago}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-text-muted">
          Sursa datelor: <a className="text-success hover:underline" href="https://stats.cs16radar.com/" target="_blank" rel="noreferrer">stats.cs16radar.com</a>
        </p>
      </section>
    </div>
  );
}

function StatCard({ label, value, desc, hue }: { label: string; value: number; desc: string; hue: number }) {
  return (
    <div
      className="relative rounded-2xl border p-5 overflow-hidden backdrop-blur-xl group hover:-translate-y-1 transition-all"
      style={{
        background: `linear-gradient(135deg, oklch(0.65 0.18 ${hue} / 0.12), oklch(0.65 0.18 ${hue} / 0.02))`,
        borderColor: `oklch(0.65 0.18 ${hue} / 0.3)`,
        boxShadow: `0 8px 32px -8px oklch(0.65 0.18 ${hue} / 0.25)`,
      }}
    >
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-30 blur-2xl group-hover:opacity-50 transition-opacity"
        style={{ background: `oklch(0.7 0.2 ${hue})` }}
      />
      <div className="relative">
        <div className="font-mono text-[0.65rem] uppercase tracking-widest mb-2" style={{ color: `oklch(0.75 0.18 ${hue})` }}>
          {label}
        </div>
        <div className="font-heading text-4xl md:text-5xl font-bold tracking-tight tabular-nums" style={{ color: `oklch(0.85 0.15 ${hue})` }}>
          {value.toLocaleString()}
        </div>
        <div className="text-xs text-text-dim mt-1">{desc}</div>
      </div>
    </div>
  );
}

function BarChart({ points }: { points: ChartPoint[] }) {
  if (points.length === 0) return <div className="h-64 flex items-center justify-center text-text-muted text-sm">Fără date</div>;
  const max = Math.max(...points.map((p) => p.cnt), 1);
  return (
    <div className="relative">
      <div className="flex items-end gap-2 h-64 border-l border-b border-border/40 pl-2 pb-2 pt-2">
        {points.map((p) => {
          const h = (p.cnt / max) * 100;
          return (
            <div key={p.d} className="group flex-1 flex flex-col items-center justify-end relative">
              <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity z-10 px-2 py-1 rounded bg-bg-deep border border-border text-[0.65rem] font-mono whitespace-nowrap">
                {p.cnt.toLocaleString()}
              </div>
              <div
                className="w-full rounded-t-md transition-all duration-500 hover:brightness-125"
                style={{
                  height: `${h}%`,
                  minHeight: p.cnt > 0 ? "4px" : "1px",
                  background: "linear-gradient(180deg, oklch(0.75 0.2 145), oklch(0.55 0.2 145 / 0.4))",
                  boxShadow: "0 0 16px oklch(0.7 0.2 145 / 0.3)",
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 pl-2 pt-2 text-[0.6rem] font-mono text-text-muted">
        {points.map((p) => (
          <div key={p.d} className="flex-1 text-center truncate">{p.d.slice(5)}</div>
        ))}
      </div>
    </div>
  );
}
