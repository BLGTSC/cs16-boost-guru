import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: (search.redirect as string) || "/dashboard",
  }),
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) toast.error(error);
      else {
        toast.success("Bine ai revenit!");
        navigate({ to: search.redirect });
      }
    } else {
      if (password.length < 6) {
        toast.error("Parola trebuie să aibă minim 6 caractere");
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, displayName);
      if (error) toast.error(error);
      else {
        toast.success("Cont creat! Te poți autentifica.");
        setMode("login");
      }
    }
    setLoading(false);
  }

  return (
    <section className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg p-8" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="font-mono text-xs text-primary tracking-[3px] uppercase mb-2">
            // {mode === "login" ? "Autentificare" : "Cont nou"}
          </div>
          <h1 className="font-heading text-3xl font-bold mb-6">
            {mode === "login" ? "Bine ai venit!" : "Creează cont"}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block font-mono text-xs tracking-wider uppercase text-text-dim mb-2">
                  Nume afișat
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-bg-deep border border-border rounded px-4 py-2.5 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                  placeholder="Nick gaming"
                />
              </div>
            )}
            <div>
              <label className="block font-mono text-xs tracking-wider uppercase text-text-dim mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bg-deep border border-border rounded px-4 py-2.5 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block font-mono text-xs tracking-wider uppercase text-text-dim mb-2">
                Parolă
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-deep border border-border rounded px-4 py-2.5 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-heading font-bold text-sm uppercase tracking-wider py-3 rounded transition-all"
            >
              {loading ? "..." : mode === "login" ? "🔐 Intră în cont" : "🚀 Creează cont"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-text-dim">
            {mode === "login" ? "Nu ai cont? " : "Ai deja cont? "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-primary hover:underline font-semibold"
            >
              {mode === "login" ? "Creează unul" : "Autentifică-te"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
