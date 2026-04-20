import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
}

export function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());

  async function load() {
    const { data } = await supabase.from("profiles").select("id,display_name,email,created_at").order("created_at", { ascending: false });
    setUsers((data as AdminUser[]) ?? []);
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    setAdminIds(new Set((roles ?? []).map((r) => r.user_id)));
  }

  useEffect(() => { load(); }, []);

  async function toggleAdmin(userId: string, isAdmin: boolean) {
    if (isAdmin) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      toast.success("Rol admin eliminat");
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      toast.success("Rol admin acordat");
    }
    load();
  }

  async function updateName(userId: string, name: string) {
    const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success("Nume actualizat");
    load();
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <Th>Nume</Th><Th>Email</Th><Th>Rol</Th><Th>Înregistrat</Th><Th>Acțiuni</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isAdmin = adminIds.has(u.id);
              return (
                <tr key={u.id} className="border-b border-border/40">
                  <td className="py-3 font-semibold text-sm">{u.display_name ?? "—"}</td>
                  <td className="py-3 text-sm text-text-dim">{u.email}</td>
                  <td className="py-3">
                    {isAdmin
                      ? <span className="text-warning font-mono text-xs uppercase">⭐ Admin</span>
                      : <span className="text-text-muted font-mono text-xs uppercase">User</span>}
                  </td>
                  <td className="py-3 text-xs text-text-muted">{new Date(u.created_at).toLocaleDateString("ro-RO")}</td>
                  <td className="py-3 space-x-3 whitespace-nowrap">
                    <button onClick={() => toggleAdmin(u.id, isAdmin)} className="text-primary hover:underline text-xs font-heading uppercase">
                      {isAdmin ? "Elimină admin" : "Fă admin"}
                    </button>
                    <button
                      onClick={() => {
                        const name = prompt("Nume nou:", u.display_name ?? "");
                        if (name !== null) updateName(u.id, name);
                      }}
                      className="text-text-dim hover:text-foreground text-xs font-heading uppercase"
                    >
                      ✎ Rename
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left text-[0.68rem] font-mono uppercase tracking-[2px] text-text-muted py-2">{children}</th>;
}
