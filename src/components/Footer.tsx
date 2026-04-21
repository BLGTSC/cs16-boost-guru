import { Link } from "@tanstack/react-router";
import { useSiteContent } from "@/hooks/useSiteContent";

export function Footer() {
  const { get } = useSiteContent();
  const brand = get("brand_name", "Cs16Radar");

  return (
    <footer className="bg-card border-t border-border px-4 md:px-8 pt-12 pb-7 mt-16">
      <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto mb-8">
        <div>
          <div className="flex items-center gap-2.5 font-heading text-xl font-bold tracking-wider mb-3">
            <div
              className="w-7 h-7 bg-primary flex items-center justify-center text-white text-xs"
              style={{ clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)" }}
            >
              ⬡
            </div>
            <span>
              {brand.slice(0, 4)}
              <span className="text-primary">{brand.slice(4)}</span>
            </span>
          </div>
          <p className="text-text-dim text-sm leading-relaxed">
            {get("footer_about", "Platforma #1 de listare CS 1.6 din România.")}
          </p>
        </div>
        <div>
          <h4 className="font-heading text-xs font-bold tracking-widest uppercase text-text-dim mb-4">
            Navigare
          </h4>
          <ul className="space-y-2 list-none">
            <li><Link to="/" className="text-text-muted hover:text-primary text-sm transition-colors">Acasă</Link></li>
            <li><Link to="/packages" className="text-text-muted hover:text-primary text-sm transition-colors">Pachete & Prețuri</Link></li>
            <li><Link to="/boost" search={{ pkg: "" }} className="text-text-muted hover:text-primary text-sm transition-colors">Adaugă Server</Link></li>
            <li><Link to="/dashboard" className="text-text-muted hover:text-primary text-sm transition-colors">Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading text-xs font-bold tracking-widest uppercase text-text-dim mb-4">
            Contact
          </h4>
          <ul className="space-y-2 list-none text-sm">
            <li className="text-text-muted">📧 {get("contact_email", "contact@cs16radar.ro")}</li>
            <li className="text-text-muted">💬 {get("contact_discord", "Discord")}</li>
            <li className="text-text-muted">📘 {get("contact_facebook", "Facebook")}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border pt-6 text-center text-xs text-text-muted max-w-6xl mx-auto font-mono">
        {get("footer_copyright", `© 2025 ${brand}`)}
      </div>
    </footer>
  );
}
