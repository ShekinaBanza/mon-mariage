"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monogram } from "@/components/wedding/monogram";
import { FloralDivider, FloralCorner } from "@/components/wedding/floral-decorations";
import { SiteFooter } from "@/components/wedding/site-footer";
import { toast } from "sonner";
import { Search, ArrowRight, Loader2, QrCode, Hash, Phone } from "lucide-react";

interface Match {
  publicToken: string;
  code: string;
  displayName: string;
  type: string;
  status: string;
  table: string | null;
}

export default function FindPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [searched, setSearched] = useState(false);

  async function search() {
    if (query.trim().length < 3) {
      toast.error("Saisissez au moins 3 caractères.");
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch("/api/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setMatches(data.matches || []);
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-background paper-texture">
      <FloralCorner className="pointer-events-none absolute left-2 top-2 text-sage/40" size={100} />
      <FloralCorner className="pointer-events-none absolute right-2 top-2 text-sage/40" size={100} flip />

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <div className="text-center">
          <Link href="/"><Monogram size={40} className="text-gold" /></Link>
          <p className="mt-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">Retrouver mon invitation</p>
          <h1 className="mt-2 font-display text-3xl text-sage-deep sm:text-4xl">Consulter mon invitation</h1>
          <FloralDivider className="mt-4" />
        </div>

        <Card className="mt-8 border-gold/30 p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="Code (ex. BAN-T1-X7K9), WhatsApp ou e-mail"
                className="pl-9"
              />
            </div>
            <Button onClick={search} disabled={loading} className="bg-sage-deep hover:bg-sage-deep/90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="mr-2 h-4 w-4" /> Rechercher</>}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Hash className="h-3 w-3 text-gold" /> Code de secours</span>
            <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-gold" /> Numéro WhatsApp</span>
            <span className="flex items-center gap-1"><QrCode className="h-3 w-3 text-gold" /> Insensible à la casse</span>
          </div>
        </Card>

        {/* Results */}
        {searched && !loading && (
          <div className="mt-6 space-y-3">
            {matches.length === 0 ? (
              <Card className="border-amber-300/60 bg-amber-50/40 p-6 text-center">
                <p className="font-serif-display text-lg text-amber-800">Aucune invitation trouvée</p>
                <p className="mt-1 text-sm text-amber-700/90">Vérifiez votre saisie ou enregistrez une nouvelle invitation.</p>
                <Link href="/register" className="mt-4 inline-block">
                  <Button variant="outline" className="border-amber-400 text-amber-800 hover:bg-amber-100">Recevoir mon invitation</Button>
                </Link>
              </Card>
            ) : (
              matches.map((m) => (
                <Card key={m.publicToken} className="flex flex-col gap-3 border-gold/30 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-display text-lg text-sage-deep">{m.displayName}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="border-gold/40 text-gold">{m.type === "couple" ? "Couple" : "Individuel"}</Badge>
                      <span>Code <span className="font-mono font-semibold text-sage-deep">{m.code}</span></span>
                      {m.table && <span>· Table {m.table}</span>}
                      <span>· Statut : {m.status}</span>
                    </div>
                  </div>
                  <Button onClick={() => router.push(`/i/${m.publicToken}`)} className="bg-sage-deep hover:bg-sage-deep/90">
                    Consulter <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
