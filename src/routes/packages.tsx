import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PackageCard, type PackageItem } from "@/components/PackageCard";
import { SectionHeader } from "@/components/SectionHeader";

export const Route = createFileRoute("/packages")({
  head: () => ({
    meta: [
      { title: "Pachete & Prețuri — MasterBoost" },
      { name: "description", content: "Pachete de boost pentru CS 1.6: Basic, Silver, Gold și Permanent. Prețuri transparente, fără surprize." },
      { property: "og:title", content: "Pachete & Prețuri — MasterBoost" },
      { property: "og:description", content: "Toate pachetele de boost CS 1.6 cu prețuri clare." },
    ],
  }),
  component: PackagesPage,
});

const FAQ: Array<[string, string]> = [
  ["Când se activează boost-ul?", "Prin PayPal — instantă. Prin transfer bancar sau Revolut — în maxim 2 ore după confirmarea plății."],
  ["Pot schimba serverul în timpul boost-ului?", "Nu, IP-ul serverului este fix pe durata boost-ului. Contactează-ne pentru situații speciale."],
  ["Ce înseamnă boost permanent?", "Serverul rămâne în masterserver fără expirare, fără plăți recurente."],
  ["Cum funcționează repartizarea jucătorilor?", "Jucătorii care descarcă clientul nostru CS 1.6 sunt direcționați aleatoriu sau spre TOP, în funcție de pachet."],
  ["Oferiți refund?", "Nu oferim refund după activarea boost-ului. Comenzile în așteptare pot fi anulate din dashboard."],
];

function PackagesPage() {
  const [packages, setPackages] = useState<PackageItem[]>([]);

  useEffect(() => {
    supabase.from("packages").select("*").eq("active", true).order("sort_order")
      .then(({ data }) => setPackages((data as PackageItem[]) ?? []));
  }, []);

  return (
    <>
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <SectionHeader
          label="// Prețuri clare, fără surprize"
          title="Pachete & Prețuri"
          subtitle="Toate pachetele includ activare instantă și suport tehnic dedicat."
          align="center"
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages.map((p) => <PackageCard key={p.id} pkg={p} />)}
        </div>
      </section>

      <section className="py-16 px-4 max-w-3xl mx-auto">
        <SectionHeader label="// Întrebări frecvente" title="FAQ" align="center" />
        <div className="space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group bg-card border border-border rounded-lg p-5 cursor-pointer transition-all hover:border-primary/40">
              <summary className="font-heading text-base font-bold list-none flex items-center justify-between">
                {q}
                <span className="text-primary text-xl transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="mt-3 text-sm text-text-dim">{a}</div>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
