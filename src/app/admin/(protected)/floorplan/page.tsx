"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Map, RefreshCw, Loader2, Printer, Eye, EyeOff } from "lucide-react";
import { TABLE_ZONE_LABELS } from "@/lib/constants";

interface Seat { id: string; number: number; code: string; positionX: number; positionY: number; status: string; }
interface Assignment { seatId: string; invitation: { id: string; code: string; type: string; side: string; status: string; presenceState: string; members: any[]; }; }
interface TableItem {
  id: string; name: string; zone: string; capacity: number; shape: string;
  positionX: number; positionY: number; active: boolean; locked: boolean;
  seats: Seat[]; assignments: Assignment[];
}

export default function FloorplanPage() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ table: TableItem; seat: Seat; assignment?: Assignment } | null>(null);
  const [onlyFree, setOnlyFree] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/tables", { cache: "no-store" });
    if (res.ok) {
      const d = await res.json();
      setTables(d.tables);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const groomTables = tables.filter((t) => t.zone === "groom");
  const brideTables = tables.filter((t) => t.zone === "bride");
  const commonTables = tables.filter((t) => t.zone === "common");

  function seatColor(table: TableItem, seat: Seat): string {
    const assignment = table.assignments.find((a) => a.seatId === seat.id);
    if (seat.status === "disabled") return "#9B9588";
    if (assignment) {
      if (assignment.invitation.presenceState === "arrived") return "#3B6E8F"; // blue
      return "#B5483E"; // red — occupied
    }
    if (seat.status === "reserved") return "#C9821E"; // orange
    return "#5E7A52"; // green — free
  }

  function seatAssignment(table: TableItem, seat: Seat): Assignment | undefined {
    return table.assignments.find((a) => a.seatId === seat.id);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-sage-deep sm:text-3xl">Plan de salle interactif</h1>
          <p className="text-sm text-muted-foreground">Visualisez les tables, chaises et présences en temps réel</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={onlyFree} onCheckedChange={setOnlyFree} /> Places libres uniquement
          </label>
          <Button onClick={load} variant="outline" size="sm"><RefreshCw className="mr-1 h-3.5 w-3.5" /> Actualiser</Button>
          <Button onClick={() => window.print()} variant="outline" size="sm"><Printer className="mr-1 h-3.5 w-3.5" /> Imprimer</Button>
        </div>
      </div>

      {/* Legend */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <Legend color="#5E7A52" label="Libre" />
          <Legend color="#C9821E" label="Réservée" />
          <Legend color="#B5483E" label="Occupée" />
          <Legend color="#3B6E8F" label="Arrivé" />
          <Legend color="#9B9588" label="Désactivée" />
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
          {/* Groom side */}
          <ZonePanel title="Côté de l'homme" subtitle="Shekina" accent="sage">
            <TablesRenderer tables={groomTables} seatColor={seatColor} onlyFree={onlyFree} onSelect={(t, s) => setSelected({ table: t, seat: s, assignment: seatAssignment(t, s) })} />
          </ZonePanel>

          {/* Divider */}
          <div className="hidden lg:flex lg:flex-col lg:items-center lg:justify-center">
            <div className="h-full w-px bg-gradient-to-b from-transparent via-gold/50 to-transparent" />
          </div>

          {/* Bride side */}
          <ZonePanel title="Côté de la femme" subtitle="Ruth" accent="gold">
            <TablesRenderer tables={brideTables} seatColor={seatColor} onlyFree={onlyFree} onSelect={(t, s) => setSelected({ table: t, seat: s, assignment: seatAssignment(t, s) })} />
          </ZonePanel>

          {/* Common zone (full width) */}
          {commonTables.length > 0 && (
            <div className="lg:col-span-3">
              <ZonePanel title="Zone commune" subtitle="" accent="neutral">
                <TablesRenderer tables={commonTables} seatColor={seatColor} onlyFree={onlyFree} onSelect={(t, s) => setSelected({ table: t, seat: s, assignment: seatAssignment(t, s) })} />
              </ZonePanel>
            </div>
          )}
        </div>
      )}

      {/* Seat detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-sage-deep">
              Chaise {selected?.seat.code}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-gold/40 text-gold">Table {selected.table.name}</Badge>
                <Badge variant="outline" className="border-sage/40 text-sage-deep">{TABLE_ZONE_LABELS[selected.table.zone]}</Badge>
                <span className="text-xs text-muted-foreground">Capacité {selected.table.capacity}</span>
              </div>
              {selected.assignment ? (
                <div className="rounded-lg border border-gold/20 bg-ivory/40 p-3 space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Occupée par</p>
                  <p className="font-display text-lg text-sage-deep">
                    {selected.assignment.invitation.members.length === 2
                      ? `${selected.assignment.invitation.members[0].firstName} & ${selected.assignment.invitation.members[1].firstName}`
                      : `${selected.assignment.invitation.members[0]?.firstName} ${selected.assignment.invitation.members[0]?.lastName}`}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">{selected.assignment.invitation.type === "couple" ? "Couple" : "Individuel"}</Badge>
                    <Badge variant="outline">{selected.assignment.invitation.side === "groom" ? "Côté homme" : "Côté femme"}</Badge>
                    <Badge variant="outline" className="font-mono">{selected.assignment.invitation.code}</Badge>
                    <Badge variant="outline" className={selected.assignment.invitation.presenceState === "arrived" ? "bg-emerald-100 text-emerald-700" : ""}>
                      {selected.assignment.invitation.presenceState === "arrived" ? "Arrivé" : "Absent"}
                    </Badge>
                  </div>
                  {selected.assignment.invitation.members.some((m) => m.arrivedAt) && (
                    <p className="text-xs text-muted-foreground">Arrivé à : {new Date(selected.assignment.invitation.members.find((m) => m.arrivedAt)?.arrivedAt).toLocaleString("fr-FR")}</p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50/50 p-3 text-center">
                  <p className="font-medium text-emerald-700">Chaise libre</p>
                  <p className="text-xs text-emerald-600/80">Disponible pour attribution</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button onClick={() => setSelected(null)}>Fermer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function ZonePanel({ title, subtitle, accent, children }: { title: string; subtitle: string; accent: "sage" | "gold" | "neutral"; children: React.ReactNode }) {
  const color = accent === "sage" ? "text-sage-deep" : accent === "gold" ? "text-gold-deep" : "text-muted-foreground";
  return (
    <Card className="p-4">
      <div className="mb-3 text-center">
        <p className={`font-display text-lg ${color}`}>{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </Card>
  );
}

function TablesRenderer({ tables, seatColor, onlyFree, onSelect }: {
  tables: TableItem[];
  seatColor: (t: TableItem, s: Seat) => string;
  onlyFree: boolean;
  onSelect: (t: TableItem, s: Seat) => void;
}) {
  if (tables.length === 0) return <p className="py-8 text-center text-xs text-muted-foreground">Aucune table.</p>;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {tables.map((t) => (
        <TableView key={t.id} table={t} seatColor={seatColor} onlyFree={onlyFree} onSelect={onSelect} />
      ))}
    </div>
  );
}

function TableView({ table, seatColor, onlyFree, onSelect }: {
  table: TableItem;
  seatColor: (t: TableItem, s: Seat) => string;
  onlyFree: boolean;
  onSelect: (t: TableItem, s: Seat) => void;
}) {
  const occupied = table.assignments.length;
  const radius = table.shape === "round" ? 46 : 50;
  const seats = table.seats;
  return (
    <div className="rounded-lg border border-gold/20 bg-ivory/20 p-2 text-center">
      <p className="font-display text-sm font-semibold text-sage-deep">{table.name}</p>
      <p className="text-[10px] text-muted-foreground">{occupied}/{table.capacity}</p>
      <svg viewBox="-70 -70 140 140" className="mx-auto mt-1 h-32 w-32">
        {/* Table */}
        {table.shape === "round" ? (
          <circle cx="0" cy="0" r={radius * 0.55} fill="#E8DFCB" stroke="#C9A961" strokeWidth="1" opacity="0.8" />
        ) : (
          <rect x={-radius * 0.7} y={-radius * 0.35} width={radius * 1.4} height={radius * 0.7} rx="6" fill="#E8DFCB" stroke="#C9A961" strokeWidth="1" opacity="0.8" />
        )}
        <text x="0" y="4" textAnchor="middle" className="font-display" fontSize="11" fill="#5E7A52" fontWeight="600">{table.name}</text>
        {/* Seats */}
        {seats.map((s) => {
          const color = seatColor(table, s);
          const taken = table.assignments.some((a) => a.seatId === s.id);
          if (onlyFree && taken) return null;
          return (
            <g key={s.id} className="cursor-pointer" onClick={() => onSelect(table, s)}>
              <circle
                cx={s.positionX}
                cy={s.positionY}
                r="9"
                fill={color}
                stroke="white"
                strokeWidth="1.5"
                className="transition-all"
              >
                <title>{s.code}{taken ? " — occupée" : " — libre"}</title>
              </circle>
              {taken && <text x={s.positionX} y={s.positionY + 2} textAnchor="middle" fontSize="6" fill="white" fontWeight="700">{s.number}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
