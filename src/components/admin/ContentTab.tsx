import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Modal } from "./ServersTab";

interface ContentRow {
  id: string;
  key: string;
  value: string;
  category: string;
  label: string | null;
}

export function ContentTab() {
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("site_content").select("*").order("category").order("key");
    const list = (data as ContentRow[]) ?? [];
    setRows(list);
    const map: Record<string, string> = {};
    list.forEach((r) => { map[r.id] = r.value; });
    setDraft(map);
  }

  useEffect(() => { load(); }, []);

  async function save(row: ContentRow) {
    setSavingKey(row.id);
    const { error } = await supabase.from("site_content").update({ value: draft[row.id] ?? "" }).eq("id", row.id);
    setSavingKey(null);
    if (error) return toast.error(error.message);
    toast.success(`${row.label || row.key} salvat`);
  }

  async function remove(row: ContentRow) {
    if (!confirm(`Ștergi cheia "${row.key}"?`)) return;
    const { error } = await supabase.from("site_content").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Șters");
    load();
  }

  // Group by category
  const groups = rows.reduce<Record<string, ContentRow[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    brand: "🏷️ Brand",
    hero: "🚀 Hero (Pagina principală)",
    contact: "📧 Contact",
    footer: "👣 Footer",
    seo: "🔍 SEO",
    general: "⚙️ General",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-text-dim">
          Editează orice text de pe site. Modificările apar instant pentru toți vizitatorii.
        </p>
        <button onClick={() => setCreating(true)} className="px-4 py-2 text-sm font-heading uppercase tracking-wider bg-primary text-primary-foreground rounded hover:bg-primary/90">
          + Cheie Nouă
        </button>
      </div>

      {Object.entries(groups).map(([cat, items]) => (
        <div key={cat} className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-heading text-lg font-bold mb-4">{categoryLabels[cat] ?? cat}</h3>
          <div className="space-y-3">
            {items.map((row) => {
              const isLong = row.value.length > 80 || row.value.includes("\n");
              return (
                <div key={row.id} className="grid md:grid-cols-[200px_1fr_auto] gap-3 items-start">
                  <div>
                    <div className="text-sm font-semibold">{row.label || row.key}</div>
                    <div className="font-mono text-[0.65rem] text-text-muted">{row.key}</div>
                  </div>
                  {isLong ? (
                    <textarea
                      rows={3}
                      className="w-full bg-bg-deep border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      value={draft[row.id] ?? ""}
                      onChange={(e) => setDraft({ ...draft, [row.id]: e.target.value })}
                    />
                  ) : (
                    <input
                      className="w-full bg-bg-deep border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      value={draft[row.id] ?? ""}
                      onChange={(e) => setDraft({ ...draft, [row.id]: e.target.value })}
                    />
                  )}
                  <div className="flex gap-1">
                    <button
                      onClick={() => save(row)}
                      disabled={savingKey === row.id || draft[row.id] === row.value}
                      className="px-3 py-2 text-xs font-heading uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 rounded hover:bg-primary/25 disabled:opacity-40"
                    >
                      {savingKey === row.id ? "..." : "💾"}
                    </button>
                    <button onClick={() => remove(row)} className="px-3 py-2 text-xs font-heading uppercase tracking-wider text-destructive hover:bg-destructive/10 rounded">🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {creating && <CreateKeyDialog onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
    </div>
  );
}

function CreateKeyDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ key: "", value: "", category: "general", label: "" });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.key.trim()) return toast.error("Cheia e obligatorie");
    setSaving(true);
    const { error } = await supabase.from("site_content").insert({
      key: form.key.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      value: form.value,
      category: form.category,
      label: form.label || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Cheie creată");
    onSaved();
  }

  const inputCls = "w-full bg-bg-deep border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary";

  return (
    <Modal onClose={onClose} title="Cheie Conținut Nouă">
      <div className="space-y-3">
        <label className="block">
          <div className="font-mono text-[0.65rem] uppercase tracking-wider text-text-muted mb-1">Cheie (snake_case)</div>
          <input className={inputCls} value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="ex. about_title" />
        </label>
        <label className="block">
          <div className="font-mono text-[0.65rem] uppercase tracking-wider text-text-muted mb-1">Etichetă (afișată în admin)</div>
          <input className={inputCls} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="ex. Titlu pagina About" />
        </label>
        <label className="block">
          <div className="font-mono text-[0.65rem] uppercase tracking-wider text-text-muted mb-1">Categorie</div>
          <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="brand">Brand</option>
            <option value="hero">Hero</option>
            <option value="contact">Contact</option>
            <option value="footer">Footer</option>
            <option value="seo">SEO</option>
            <option value="general">General</option>
          </select>
        </label>
        <label className="block">
          <div className="font-mono text-[0.65rem] uppercase tracking-wider text-text-muted mb-1">Valoare</div>
          <textarea rows={3} className={inputCls} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
        </label>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="px-4 py-2 text-sm font-heading uppercase tracking-wider border border-border rounded hover:bg-bg-hover">Anulează</button>
        <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-heading uppercase tracking-wider bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50">
          {saving ? "..." : "💾 Creează"}
        </button>
      </div>
    </Modal>
  );
}
