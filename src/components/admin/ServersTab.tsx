import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminServer {
  id: string;
  name: string;
  hostname: string | null;
  ip: string;
  port: number;
  status: string;
  expires_at: string | null;
  current_map: string | null;
  players_current: number;
  players_max: number;
  package_id: string;
  packages: { name: string; color: string } | null;
  profiles: { display_name: string | null; email: string | null } | null;
}

interface PkgOption { id: string; name: string; duration_days: number | null }

export function ServersTab() {
  const [servers, setServers] = useState<AdminServer[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [packages, setPackages] = useState<PkgOption[]>([]);
  const [editing, setEditing] = useState<AdminServer | null>(null);

  async function load() {
    let q = supabase.from("servers").select("id,name,hostname,ip,port,status,expires_at,current_map,players_current,players_max,package_id,packages(name,color),profiles!servers_user_id_fkey(display_name,email)");
    if (filter !== "all") q = q.eq("status", filter as "active" | "pending" | "expired" | "suspended");
    const { data } = await q.order("created_at", { ascending: false });
    setServers((data as unknown as AdminServer[]) ?? []);
  }

  useEffect(() => {
    load();
    supabase.from("packages").select("id,name,duration_days").order("sort_order")
      .then(({ data }) => setPackages((data as PkgOption[]) ?? []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function activate(s: AdminServer) {
    const pkg = packages.find((p) => p.id === s.package_id);
    const expires = pkg?.duration_days
      ? new Date(Date.now() + pkg.duration_days * 86400 * 1000).toISOString()
      : null;
    const { error } = await supabase.from("servers").update({
      status: "active",
      activated_at: new Date().toISOString(),
      expires_at: expires,
    }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Server activat");
    load();
  }

  async function suspend(id: string) {
    const { error } = await supabase.from("servers").update({ status: "suspended" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Server suspendat");
    load();
  }

  async function deleteServer(id: string) {
    if (!confirm("Ștergi definitiv serverul?")) return;
    const { error } = await supabase.from("servers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Server șters");
    load();
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-bg-deep border border-border rounded px-3 py-1.5 text-sm">
          <option value="all">Toate ({servers.length})</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="expired">Expirate</option>
          <option value="suspended">Suspendate</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <Th>Server</Th><Th>Utilizator</Th><Th>Pachet</Th><Th>Hartă/Jucători</Th><Th>Status</Th><Th>Acțiuni</Th>
            </tr>
          </thead>
          <tbody>
            {servers.map((s) => (
              <tr key={s.id} className="border-b border-border/40 hover:bg-bg-hover/30">
                <td className="py-3">
                  <div className="font-semibold text-sm">{s.hostname || s.name}</div>
                  <div className="font-mono text-xs text-text-muted">{s.ip}:{s.port}</div>
                </td>
                <td className="py-3 text-sm">{s.profiles?.display_name ?? s.profiles?.email ?? "—"}</td>
                <td className="py-3 text-sm">{s.packages?.name ?? "—"}</td>
                <td className="py-3 text-xs font-mono">
                  <div className="text-text-dim">{s.current_map || "—"}</div>
                  <div className="text-success">{s.players_current}/{s.players_max}</div>
                </td>
                <td className="py-3 text-xs uppercase font-mono">{s.status}</td>
                <td className="py-3 space-x-2 whitespace-nowrap">
                  {s.status === "pending" && (
                    <button onClick={() => activate(s)} className="text-success hover:underline text-xs font-heading uppercase">✓ Activează</button>
                  )}
                  <button onClick={() => setEditing(s)} className="text-primary hover:underline text-xs font-heading uppercase">✎ Edit</button>
                  {s.status === "active" && (
                    <button onClick={() => suspend(s.id)} className="text-warning hover:underline text-xs font-heading uppercase">⏸ Suspendă</button>
                  )}
                  <button onClick={() => deleteServer(s.id)} className="text-destructive hover:underline text-xs font-heading uppercase">🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditServerDialog
          server={editing}
          packages={packages}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function EditServerDialog({ server, packages, onClose, onSaved }: {
  server: AdminServer;
  packages: PkgOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: server.name,
    hostname: server.hostname ?? "",
    ip: server.ip,
    port: server.port,
    package_id: server.package_id,
    status: server.status,
    current_map: server.current_map ?? "",
    players_current: server.players_current,
    players_max: server.players_max,
    expires_at: server.expires_at ? server.expires_at.slice(0, 16) : "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("servers").update({
      name: form.name,
      hostname: form.hostname || null,
      ip: form.ip,
      port: Number(form.port),
      package_id: form.package_id,
      status: form.status as "active" | "pending" | "expired" | "suspended",
      current_map: form.current_map || null,
      players_current: Number(form.players_current),
      players_max: Number(form.players_max),
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    }).eq("id", server.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Server actualizat");
    onSaved();
  }

  return (
    <Modal onClose={onClose} title="Editează Server">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nume"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Hostname (display)"><input className={inputCls} value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} /></Field>
        <Field label="IP"><input className={inputCls} value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} /></Field>
        <Field label="Port"><input type="number" className={inputCls} value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} /></Field>
        <Field label="Pachet">
          <select className={inputCls} value={form.package_id} onChange={(e) => setForm({ ...form, package_id: e.target.value })}>
            {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
          </select>
        </Field>
        <Field label="Hartă curentă"><input className={inputCls} value={form.current_map} onChange={(e) => setForm({ ...form, current_map: e.target.value })} /></Field>
        <Field label="Expiră la"><input type="datetime-local" className={inputCls} value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></Field>
        <Field label="Jucători live"><input type="number" className={inputCls} value={form.players_current} onChange={(e) => setForm({ ...form, players_current: Number(e.target.value) })} /></Field>
        <Field label="Sloturi max"><input type="number" className={inputCls} value={form.players_max} onChange={(e) => setForm({ ...form, players_max: Number(e.target.value) })} /></Field>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="px-4 py-2 text-sm font-heading uppercase tracking-wider border border-border rounded hover:bg-bg-hover">Anulează</button>
        <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-heading uppercase tracking-wider bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50">
          {saving ? "..." : "💾 Salvează"}
        </button>
      </div>
    </Modal>
  );
}

const inputCls = "w-full bg-bg-deep border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="font-mono text-[0.65rem] uppercase tracking-wider text-text-muted mb-1">{label}</div>
      {children}
    </label>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left text-[0.68rem] font-mono uppercase tracking-[2px] text-text-muted py-2">{children}</th>;
}

export function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-foreground text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
