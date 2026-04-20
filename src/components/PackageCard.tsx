import { Link } from "@tanstack/react-router";

export interface PackageItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  duration_days: number | null;
  features: unknown;
  max_slots: number;
  color: string;
  featured: boolean;
}

interface Props {
  pkg: PackageItem;
  showCta?: boolean;
  ctaLabel?: string;
}

export function PackageCard({ pkg, showCta = true, ctaLabel = "Comandă Acum" }: Props) {
  const features = Array.isArray(pkg.features) ? (pkg.features as string[]) : [];

  return (
    <div
      className={`relative flex flex-col p-7 rounded-lg border transition-all hover:-translate-y-1 ${
        pkg.featured
          ? "bg-gradient-to-br from-card to-primary/5 border-primary"
          : "bg-card border-border hover:border-primary/40"
      }`}
      style={pkg.featured ? { boxShadow: "var(--shadow-card)" } : {}}
    >
      {pkg.featured && (
        <div className="absolute -top-px right-6 bg-primary text-primary-foreground font-heading text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-b-md">
          ⭐ Popular
        </div>
      )}
      <div className="font-heading text-2xl font-bold tracking-wide" style={{ color: pkg.color }}>
        {pkg.name}
      </div>
      <div className="text-xs text-text-muted font-mono mb-5">
        {pkg.duration_days ? `${pkg.duration_days} zile` : "∞ Fără expirare"}
      </div>
      <div className="font-heading text-5xl font-bold leading-none mb-1">
        <sup className="text-lg align-top mt-2 text-text-dim">€</sup>
        {pkg.price}
      </div>
      <ul className="my-5 space-y-1.5 flex-1 list-none">
        {features.map((f, i) => (
          <li key={i} className="text-sm text-text-dim flex items-start gap-2">
            <span className="text-success font-bold text-xs mt-1">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {showCta && (
        <Link
          to="/boost"
          search={{ pkg: pkg.slug }}
          className="block text-center bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-bold text-sm uppercase tracking-wider px-4 py-3 rounded transition-all"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
