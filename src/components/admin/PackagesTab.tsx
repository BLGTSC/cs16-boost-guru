import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Modal } from "./ServersTab";

interface AdminPkg {
  id: string;
  name: string;
  slug: string;
  price: number;
  duration_days: number | null;
  max_slots: number;
  active: boolean;
  featured: boolean;
  color: string;
  sort_order: number;
  features: unknown;
}

export function PackagesTab() {
  const [pkgs, setPkgs] = useState<AdminPkg[]>([]);
  const [editing, setEditing] = useState<AdminPkg | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const { data } = await supabase.from("packages").select("*").order("sort_order");
    setPkgs((data as AdminPkg[]) ?? []);
  }

  useEffect(() => { load(); }, []);

  async function deletePkg(id: string) {
    if (!confirm("Ștergi pachetul? (Doar dacă nu are servere atașate)")) return;
    const { error } = await supabase.from("packages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Pachet șters");
    load();
  }

  async function toggleActive(p: AdminPkg) {
    const { error } = await supabase.from("packages").update({ active: !p.active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex justify-end mb-4">
        <button onClick={() => setCreating(true)} className="px-4 py-2 text-sm font-heading uppercase tracking-wider bg-primary text-primary-foreground rounded hover:bg-primary/90">
          + Pachet Nou
        </button>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <Th>Nume</Th><Th>Slug</Th><Th>Preț</Th><Th>Durată</Th><Th>Sloturi</Th><Th>Ordine</Th><Th>Status</Th><Th>Acțiuni</Th>
          </tr>
        </thead>
        <tbody>
          {pkgs.map((p) => (
            <tr key={p.id} className="border-b border-border/40">
              <td className="py-3 font-heading font-bold" style={{ color: p.color }}>
                {p.name} {p.featured && <span className="ml-1 text-[0.6rem] text-warning">⭐</span>}
              </td>
              <td className="py-3 font-mono text-xs text-text-muted">{p.slug}</td>
              <td className="py-3 font-mono">{Number(p.price) === 0 ? "GRATUIT" : `€${p.price}`}</td>
              <td className="py-3 text-sm">{p.duration_days ? `${p.duration_days} zile` : "Permanent"}</td>
              <td className="py-3 font-mono text-sm">{p.max_slots}</td>
              <td className="py-3 font-mono text-sm">{p.sort_order}</td>
              <td className="py-3">
                <button onClick={() => toggleActive(p)} className={`font-mono text-xs uppercase ${p.active ? "text-success" : "text-text-muted"}`}>
                  {p.active ? "Activ" : "Inactiv"}
                </button>
              </td>
              <td className="py-3 space-x-2 whitespace-nowrap">
                <button onClick={() => setEditing(p)} className="text-primary hover:underline text-xs font-heading uppercase">✎ Edit</button>
                <button onClick={() => deletePkg(p.id)} className="text-destructive hover:underline text-xs font-heading uppercase">🗑</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <PackageDialog
          pkg={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {creating && (
        <PackageDialog
          pkg={null}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); load(); }}
        />
      )}
    </div>
  );
}

function PackageDialog({ pkg, onClose, onSaved }: { pkg: AdminPkg | null; onClose: () => void; onSaved: () => void }) {
  const initialFeatures = Array.isArray(pkg?.features) ? (pkg!.features as string[]).join("\n") : "";
  const [form, setForm] = useState({
    name: pkg?.name ?? "",
    slug: pkg?.slug ?? "",
    price: pkg?.price ?? 0,
    duration_days: pkg?.duration_days ?? 30,
    max_slots: pkg?.max_slots ?? 50,
    color: pkg?.color ?? "#3b82f6",
    featured: pkg?.featured ?? false,
    active: pkg?.active ?? true,
    sort_order: pkg?.sort_order ?? 0,
    features: initialFeatures,
    permanent: pkg ? pkg.duration_days === null : false,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Nume și slug obligatorii");
      return;
    }
    setSaving(true);
    const featuresArr = form.features.split("\n").map((s) => s.trim()).filter(Boolean);
    const payload = {
      name: form.name,
      slug: form.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      price: Number(form.price),
      duration_days: form.permanent ? null : Number(form.duration_days),
      max_slots: Number(form.max_slots),
      color: form.color,
      featured: form.featured,
      active: form.active,
      sort_order: Number(form.sort_order),
      features: featuresArr,
    };

    const { error } = pkg
      ? await supabase.from("packages").update(payload).eq("id", pkg.id)
      : await supabase.from("packages").insert(payload);

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(pkg ? "Pachet actualizat" : "Pachet creat");
    onSaved();
  }

  return (
    <Modal onClose={onClose} title={pkg ? `Editează: ${pkg.name}` : "Pachet Nou"}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nume"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Slug"><input className={inputCls} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
        <Field label="Preț (€) — 0 = gratuit"><input type="number" step="0.01" className={inputCls} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></Field>
        <Field label="Durată (zile)"><input type="number" disabled={form.permanent} className={inputCls} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} /></Field>
        <Field label="Sloturi max"><input type="number" className={inputCls} value={form.max_slots} onChange={(e) => setForm({ ...form, max_slots: Number(e.target.value) })} /></Field>
        <Field label="Culoare (hex)">
          <div className="flex gap-2">
            <input type="color" className="w-12 h-10 bg-bg-deep border border-border rounded" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            <input className={inputCls} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </div>
        </Field>
        <Field label="Sort order"><input type="number" className={inputCls} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
        <Field label="Opțiuni">
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.permanent} onChange={(e) => setForm({ ...form, permanent: e.target.checked })} /> Permanent (fără expirare)</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured (popular)</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Activ (vizibil)</label>
          </div>
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Features (1 pe linie)">
          <textarea rows={5} className={inputCls + " font-mono text-xs"} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="Listare gratuită 7 zile&#10;Server vizibil pe Cs16Radar" />
        </Field>
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
