import { useEffect, useState } from "react";

interface Props {
  expiresAt: string | null;
}

export function Countdown({ expiresAt }: Props) {
  const [, force] = useState(0);

  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!expiresAt) {
    return <span className="font-mono text-sm text-success">PERMANENT ∞</span>;
  }

  const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);

  if (diff <= 0) {
    return <span className="font-mono text-sm text-destructive">EXPIRAT</span>;
  }

  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  const cls = d < 3 ? "text-warning" : "text-primary";
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span className={`font-mono text-sm ${cls}`}>
      {d > 0 ? `${d}z ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`}
    </span>
  );
}
