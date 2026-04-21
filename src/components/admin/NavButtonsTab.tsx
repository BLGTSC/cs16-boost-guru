import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavButtons, type NavButton } from "@/hooks/useNavButtons";
import { Modal } from "@/components/admin/ServersTab";

export function NavButtonsTab() {
  const { buttons, refresh } = useNavButtons(false);
  const [editing, setEditing] = useState<NavButton | null>(null);
  const [creating, setCreating] = useState(false);

  async function toggleActive(b: NavButton) {
    const { error } = await supabase.from("nav_buttons").update({ active: !b.active }).eq("id", b.id);
    if (error) return toast.error(error.message);
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Ștergi acest buton?")) return;
    const { error } = await supabase.from("nav_buttons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Buton șters");
    refresh();
  }

  async function move(b: NavButton, dir: -1 | 1) {
    const { error } = await supabase.from("nav_buttons").update({ sort_order: b.sort_order + dir }).eq("id", b.id);
    if (error) return toast.error(error.message);
    refresh();
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-dim">Butoane custom adăugate în meniul de navigare.</p>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 text-sm font-heading uppercase tracking-wider bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          + Adaugă buton
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <Th>Ordine</Th><Th>Label</Th><Th>Link</Th><Th>Extern</Th><Th>Activ</Th><Th>Acțiuni</Th>
            </tr>
          </thead>
          <tbody>
            {buttons.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-text-muted text-sm">Niciun buton încă. Adaugă primul!</td></tr>
            )}
            {buttons.map((b) => (
              <tr key={b.id} className="border-b border-border/40 hover:bg-bg-hover/30">
                <td className="py-3 text-xs font-mono">
                  <div className="flex items-center gap-1">
                    <span>{b.sort_order}</span>
                    <button onClick={() => move(b, -1)} className="text-text-muted hover:text-foreground">↑</button>
                    <button onClick={() => move(b, 1)} className="text-text-muted hover:text-foreground">↓</button>
                  </div>
                </td>
                <td className="py-3 text-sm font-semibold">
                  {b.icon && <span className="mr-1">{b.icon}</span>}{b.label}
                </td>
                <td className="py-3 text-xs font-mono text-text-dim">{b.href}</td>
                <td className="py-3 text-xs">{b.external ? "✓" : "—"}</td>
                <td className="py-3">
                  <button onClick={() => toggleActive(b)} className={`text-xs font-heading uppercase ${b.active ? "text-success" : "text-text-muted"}`}>
                    {b.active ? "● Activ" : "○ Inactiv"}
                  </button>
                </td>
                <td className="py-3 space-x-2 whitespace-nowrap">
                  <button onClick={() => setEditing(b)} className="text-primary hover:underline text-xs font-heading uppercase">✎ Edit</button>
                  <button onClick={() => remove(b.id)} className="text-destructive hover:underline text-xs font-heading uppercase">🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(editing || creating) && (
        <NavButtonDialog
          button={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); refresh(); }}
        />
      )}
    </div>
  );
}

function NavButtonDialog({ button, onClose, onSaved }: {
  button: NavButton | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    label: button?.label ?? "",
    href: button?.href ?? "",
    external: button?.external ?? false,
    icon: button?.icon ?? "",
    sort_order: button?.sort_order ?? 100,
    active: button?.active ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.label.trim() || !form.href.trim()) {
      return toast.error("Label și link sunt obligatorii");
    }
    setSaving(true);
    const payload = {
      label: form.label.trim(),
      href: form.href.trim(),
      external: form.external,
      icon: form.icon.trim() || null,
      sort_order: Number(form.sort_order),
      active: form.active,
    };
    const { error } = button
      ? await supabase.from("nav_buttons").update(payload).eq("id", button.id)
      : await supabase.from("nav_buttons").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(button ? "Buton actualizat" : "Buton creat");
    onSaved();
  }

  return (
    <Modal onClose={onClose} title={button ? "Editează buton" : "Adaugă buton"}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Label *">
          <input className={inputCls} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex: Forum" />
        </Field>
        <Field label="Icon (emoji opțional)">
          <input className={inputCls} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="💬" />
        </Field>
        <Field label="Link / URL *">
          <input className={inputCls} value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} placeholder="/blog sau https://..." />
        </Field>
        <Field label="Ordine sortare">
          <input type="number" className={inputCls} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.external} onChange={(e) => setForm({ ...form, external: e.target.checked })} />
          Deschide în tab nou
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Activ (vizibil)
        </label>
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
