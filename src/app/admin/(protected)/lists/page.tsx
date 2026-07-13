"use client";

import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, Users, MapPin } from "lucide-react";

interface Guest {
  id: string; code: string; publicToken: string; type: string; side: string; status: string;
  presenceState: string; displayName: string; whatsapp: string; table: string | null;
  seatCodes: string[]; members: any[]; arrivedAt: string | null;
}

export default function ListsPage() {
  const [items, setItems] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Fetch all guests (large perPage)
      const res = await fetch("/api/guests?perPage=1000", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setItems(d.items);
      }
      setLoading(false);
    })();
  }, []);

  const active = useMemo(() => items.filter((g) => g.status === "active" || g.status === "approved"), [items]);
  const byTable = useMemo(() => {
    const map = new Map<string, Guest[]>();
    for (const g of active) {
      const k = g.table ?? "Non placé";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(g);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [active]);
  const groomSide = active.filter((g) => g.side === "groom");
  const brideSide = active.filter((g) => g.side === "bride");
  const couples = active.filter((g) => g.type === "couple");
  const singles = active.filter((g) => g.type === "individual");
  const present = active.filter((g) => g.presenceState === "arrived" || g.presenceState === "partially_arrived");
  const absent = active.filter((g) => g.presenceState === "not_arrived");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <h1 className="font-display text-2xl text-sage-deep sm:text-3xl">Listes imprimables</h1>
          <p className="text-sm text-muted-foreground">Listes de secours pour contrôle manuel en cas de panne</p>
        </div>
        <Button onClick={() => window.print()} className="bg-sage-deep hover:bg-sage-deep/90"><Printer className="mr-2 h-4 w-4" /> Imprimer cette vue</Button>
      </div>

      {loading ? (
        <Skeleton className="h-96" />
      ) : (
        <Tabs defaultValue="general">
          <TabsList className="no-print flex flex-wrap h-auto">
            <TabsTrigger value="general"><Users className="mr-1 h-3 w-3" /> Générale ({active.length})</TabsTrigger>
            <TabsTrigger value="table"><MapPin className="mr-1 h-3 w-3" /> Par table</TabsTrigger>
            <TabsTrigger value="groom">Homme ({groomSide.length})</TabsTrigger>
            <TabsTrigger value="bride">Femme ({brideSide.length})</TabsTrigger>
            <TabsTrigger value="couples">Couples ({couples.length})</TabsTrigger>
            <TabsTrigger value="singles">Seuls ({singles.length})</TabsTrigger>
            <TabsTrigger value="present">Présents ({present.length})</TabsTrigger>
            <TabsTrigger value="absent">Absents ({absent.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="general"><PrintableList title="Liste générale des invités" guests={active} /></TabsContent>
          <TabsContent value="table">
            <div className="space-y-4">
              {byTable.map(([tableName, list]) => <PrintableList key={tableName} title={`Table ${tableName}`} guests={list} />)}
            </div>
          </TabsContent>
          <TabsContent value="groom"><PrintableList title="Invités côté de l'homme (Shekina)" guests={groomSide} /></TabsContent>
          <TabsContent value="bride"><PrintableList title="Invités côté de la femme (Ruth)" guests={brideSide} /></TabsContent>
          <TabsContent value="couples"><PrintableList title="Liste des couples" guests={couples} /></TabsContent>
          <TabsContent value="singles"><PrintableList title="Liste des personnes seules" guests={singles} /></TabsContent>
          <TabsContent value="present"><PrintableList title="Liste des présents" guests={present} /></TabsContent>
          <TabsContent value="absent"><PrintableList title="Liste des absents" guests={absent} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function PrintableList({ title, guests }: { title: string; guests: Guest[] }) {
  return (
    <Card className="overflow-hidden border-gold/30">
      <div className="border-b border-gold/20 bg-ivory/60 px-4 py-2">
        <h3 className="font-display text-lg text-sage-deep">{title}</h3>
        <p className="text-xs text-muted-foreground">{guests.length} invitation(s)</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ivory/40 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-2 py-2 text-left">#</th>
              <th className="px-2 py-2 text-left">Nom</th>
              <th className="px-2 py-2 text-left hidden sm:table-cell">Type</th>
              <th className="px-2 py-2 text-left hidden md:table-cell">WhatsApp</th>
              <th className="px-2 py-2 text-left">Table</th>
              <th className="px-2 py-2 text-left hidden lg:table-cell">Places</th>
              <th className="px-2 py-2 text-left hidden sm:table-cell">Code secours</th>
              <th className="px-2 py-2 text-center">Présence</th>
              <th className="px-2 py-2 text-center hidden print:table-cell">Heure</th>
              <th className="px-2 py-2 text-left hidden print:table-cell">Obs.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold/10">
            {guests.map((g, i) => (
              <tr key={g.id} className="hover:bg-ivory/30">
                <td className="px-2 py-1.5 text-xs text-muted-foreground">{i + 1}</td>
                <td className="px-2 py-1.5 font-medium text-sage-deep">{g.displayName}</td>
                <td className="px-2 py-1.5 hidden sm:table-cell">
                  <Badge variant="outline" className="text-[10px]">{g.type === "couple" ? "Couple" : "Indiv."}</Badge>
                </td>
                <td className="px-2 py-1.5 hidden md:table-cell text-xs">{g.whatsapp}</td>
                <td className="px-2 py-1.5 text-sm">{g.table ?? "—"}</td>
                <td className="px-2 py-1.5 hidden lg:table-cell font-mono text-xs">{g.seatCodes.join(" ")}</td>
                <td className="px-2 py-1.5 hidden sm:table-cell font-mono text-xs text-sage-deep">{g.code}</td>
                <td className="px-2 py-1.5 text-center">
                  <span className="inline-block h-4 w-4 rounded border border-muted-foreground/50 print:border-black" />
                </td>
                <td className="px-2 py-1.5 hidden print:table-cell" />
                <td className="px-2 py-1.5 hidden print:table-cell" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
