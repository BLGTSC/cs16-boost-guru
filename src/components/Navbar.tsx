import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteContent } from "@/hooks/useSiteContent";

const navItems: Array<{ to: string; label: string }> = [
  { to: "/", label: "Acasă" },
  { to: "/servers", label: "Servere" },
  { to: "/packages", label: "Pachete" },
];

export function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const { get } = useSiteContent();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const brand = get("brand_name", "Cs16Radar");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 px-4 md:px-8 flex items-center justify-between bg-bg-deep/90 backdrop-blur-md border-b border-border">
      <Link to="/" className="flex items-center gap-2.5 font-heading text-xl font-bold tracking-wider">
        <div
          className="w-7 h-7 bg-primary flex items-center justify-center text-white text-xs font-bold"
          style={{ clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)" }}
        >
          ⬡
        </div>
        <span>
          {brand.slice(0, 4)}
          <span className="text-primary">{brand.slice(4)}</span>
        </span>
      </Link>

      <ul className="hidden md:flex items-center gap-1 list-none">
        {navItems.map((item) => {
          const active = path === item.to;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`px-3.5 py-1.5 rounded font-heading font-semibold text-sm uppercase tracking-wider transition-all ${
                  active ? "text-foreground bg-primary/15" : "text-text-dim hover:text-foreground hover:bg-primary/10"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
        {user && (
          <li>
            <Link
              to="/dashboard"
              className={`px-3.5 py-1.5 rounded font-heading font-semibold text-sm uppercase tracking-wider transition-all ${
                path.startsWith("/dashboard") ? "text-foreground bg-primary/15" : "text-text-dim hover:text-foreground hover:bg-primary/10"
              }`}
            >
              Dashboard
            </Link>
          </li>
        )}
        {isAdmin && (
          <li>
            <Link
              to="/admin"
              className={`px-3.5 py-1.5 rounded font-heading font-semibold text-sm uppercase tracking-wider transition-all ${
                path.startsWith("/admin") ? "text-warning bg-warning/15" : "text-warning/80 hover:text-warning hover:bg-warning/10"
              }`}
            >
              ⭐ Admin
            </Link>
          </li>
        )}
      </ul>

      <div className="flex items-center gap-2">
        {user ? (
          <>
            <Link
              to="/boost"
              search={{ pkg: "" }}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-bold text-sm uppercase tracking-wider rounded transition-all hover:-translate-y-0.5"
              style={{ boxShadow: "var(--shadow-button)" }}
            >
              + Server
            </Link>
            <button
              onClick={() => signOut()}
              className="px-3 py-2 text-text-dim hover:text-foreground text-sm font-heading uppercase tracking-wider"
            >
              Ieșire
            </button>
          </>
        ) : (
          <Link
            to="/auth"
            search={{ redirect: "/dashboard" }}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-bold text-sm uppercase tracking-wider rounded transition-all"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
