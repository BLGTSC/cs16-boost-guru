interface Props {
  label?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}

export function SectionHeader({ label, title, subtitle, align = "left" }: Props) {
  return (
    <div className={`mb-10 ${align === "center" ? "text-center" : ""}`}>
      {label && (
        <div className="font-mono text-xs text-primary tracking-[3px] uppercase mb-3">
          {label}
        </div>
      )}
      <h2 className="font-heading text-3xl md:text-5xl font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-3 text-text-dim max-w-2xl">{subtitle}</p>}
    </div>
  );
}
