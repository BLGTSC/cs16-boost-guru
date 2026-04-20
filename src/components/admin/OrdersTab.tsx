import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Modal } from "./ServersTab";

interface AdminOrder {
  id: string;
  order_number: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  notes: string | null;
  packages: { name: string } | null;
  profiles: { display_name: string | null; email: string | null } | null;
}

export function OrdersTab() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [editing, setEditing] = useState<AdminOrder | null>(null);

  async function load() {
    const { data } = await supabase
      .from("orders")
      .select("id,order_number,amount,payment_method,status,created_at,notes,packages(name),profiles!orders_user_id_fkey(display_name,email)")
      .order("created_at", { ascending: false });
    setOrders((data as unknown as AdminOrder[]) ?? []);
  }

  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: "paid" | "cancelled" | "failed" | "refunded") {
    const update = status === "paid"
      ? { status, paid_at: new Date().toISOString() }
      : { status };
    const { error } = await supabase.from("orders").update(update).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Comandă actualizată");
    load();
  }

  async function deleteOrder(id: string) {
    if (!confirm("Ștergi comanda?")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Comandă ștearsă");
    load();
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <Th>Nr.</Th><Th>Utilizator</Th><Th>Pachet</Th><Th>Sumă</Th><Th>Metodă</Th><Th>Status</Th><Th>Acțiuni</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border/40">
                <td className="py-3 font-mono text-xs text-primary">{o.order_number}</td>
                <td className="py-3 text-sm">{o.profiles?.display_name ?? o.profiles?.email ?? "—"}</td>
                <td className="py-3 text-sm">{o.packages?.name ?? "—"}</td>
                <td className="py-3 font-mono">€{Number(o.amount).toFixed(0)}</td>
                <td className="py-3 text-xs capitalize">{o.payment_method}</td>
                <td className="py-3 text-xs uppercase font-mono">{o.status}</td>
                <td className="py-3 space-x-2 whitespace-nowrap">
                  {o.status === "pending" && (
                    <button onClick={() => setStatus(o.id, "paid")} className="text-success hover:underline text-xs font-heading uppercase">✓ Plătit</button>
                  )}
                  <button onClick={() => setEditing(o)} className="text-primary hover:underline text-xs font-heading uppercase">✎ Edit</button>
                  <button onClick={() => deleteOrder(o.id)} className="text-destructive hover:underline text-xs font-heading uppercase">🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditOrderDialog
          order={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function EditOrderDialog({ order, onClose, onSaved }: { order: AdminOrder; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    amount: order.amount,
    status: order.status,
    payment_method: order.payment_method,
    notes: order.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const base = {
      amount: Number(form.amount),
      status: form.status as "pending" | "paid" | "failed" | "cancelled" | "refunded",
      payment_method: form.payment_method as "paypal" | "transfer" | "revolut" | "stripe",
      notes: form.notes || null,
    };
    const update = form.status === "paid" && order.status !== "paid"
      ? { ...base, paid_at: new Date().toISOString() }
      : base;
    const { error } = await supabase.from("orders").update(update).eq("id", order.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Comandă actualizată");
    onSaved();
  }

  return (
    <Modal onClose={onClose} title={`Editează Comanda ${order.order_number}`}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sumă (€)"><input type="number" step="0.01" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
        <Field label="Status">
          <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </Field>
        <Field label="Metodă">
          <select className={inputCls} value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
            <option value="paypal">PayPal</option>
            <option value="transfer">Transfer</option>
            <option value="revolut">Revolut</option>
            <option value="stripe">Stripe</option>
          </select>
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Note">
          <textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
