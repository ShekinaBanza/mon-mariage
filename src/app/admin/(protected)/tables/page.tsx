"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Lock, Armchair, MapPin, Loader2 } from "lucide-react";
import { TABLE_ZONE_LABELS } from "@/lib/constants";

interface TableItem {
  id: string;
  name: string;
  zone: string;
  capacity: number;
  shape: string;
  active: boolean;
  locked: boolean;
  positionX: number;
  positionY: number;
  seats: any[];
  assignments: any[];
}

export default function TablesPage() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tableActionId, setTableActionId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", zone: "groom", capacity: 8, shape: "round" });

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

  async function create() {
    if (!form.name.trim()) { toast.error("Nom requis"); return; }
    setCreating(true);
    const res = await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (!res.ok) { toast.error(d.error); setCreating(false); return; }
    toast.success(`Table ${form.name} créée`);
    setCreateOpen(false);
    setForm({ name: "", zone: "groom", capacity: 8, shape: "round" });
    setCreating(false);
    load();
  }

  async function toggle(id: string, field: "active" | "locked", value: boolean) {
    setTableActionId(`${id}:${field}`);
    const res = await fetch(`/api/tables/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) { toast.success("Modifié"); load(); }
    else toast.error("Échec");
    setTableActionId(null);
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Supprimer la table ${name} ?`)) return;
    setTableActionId(`${id}:delete`);
    const res = await fetch(`/api/tables/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Table supprimée"); load(); }
    else { const d = await res.json(); toast.error(d.error); }
    setTableActionId(null);
  }

  const totalCapacity = tables.reduce((s, t) => s + t.capacity, 0);
  const totalOccupied = tables.reduce((s, t) => s + t.assignments.length, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-sage-deep sm:text-3xl">Tables &amp; chaises</h1>
          <p className="text-sm text-muted-foreground">{tables.length} tables · {totalOccupied}/{totalCapacity} places occupées</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-sage-deep hover:bg-sage-deep/90">
          <Plus className="mr-2 h-4 w-4" /> Nouvelle table
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((t) => {
            const occupied = t.assignments.length;
            const free = t.capacity - occupied;
            const pct = t.capacity > 0 ? Math.round((occupied / t.capacity) * 100) : 0;
            const full = occupied >= t.capacity;
            return (
              <Card key={t.id} className={`overflow-hidden ${!t.active ? "opacity-60" : ""} ${t.locked ? "ring-2 ring-amber-300" : ""}`}>
                <div className="flex items-start justify-between border-b border-gold/15 bg-ivory/40 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-xl text-sage-deep">{t.name}</h3>
                      {t.locked && <Badge variant="outline" className="border-amber-400 text-amber-700"><Lock className="mr-1 h-3 w-3" /> Verrouillée</Badge>}
                      {!t.active && <Badge variant="outline" className="border-gray-400 text-gray-600">Inactive</Badge>}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {TABLE_ZONE_LABELS[t.zone]}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" loading={tableActionId === `${t.id}:delete`} loadingText="" disabled={tableActionId !== null} className="h-8 w-8 p-0 text-destructive" onClick={() => remove(t.id, t.name)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground"><Armchair className="h-4 w-4" /> {occupied}/{t.capacity}</span>
                    <span className={`font-medium ${full ? "text-emerald-600" : "text-sage-deep"}`}>{full ? "Complète" : `${free} libres`}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-ivory">
                    <div className={`h-full rounded-full transition-all ${full ? "bg-emerald-500" : pct > 50 ? "bg-gold" : "bg-sage"}`} style={{ width: `${pct}%` }} />
                  </div>

                  {/* Seats grid */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.seats.map((s) => {
                      const taken = t.assignments.some((a) => a.seatId === s.id);
                      const color = !s.active || s.status === "disabled" ? "bg-gray-300" : taken ? "bg-sage-deep text-ivory" : "bg-ivory border border-gold/30 text-muted-foreground";
                      return <span key={s.id} className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${color}`} title={s.code}>{s.code}</span>;
                    })}
                  </div>

                  {/* Toggles */}
                  <div className="mt-4 flex items-center gap-4 border-t border-gold/15 pt-3">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch checked={t.active} onCheckedChange={(v) => toggle(t.id, "active", v)} /> Active
                    </label>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch checked={t.locked} onCheckedChange={(v) => toggle(t.id, "locked", v)} /> <Lock className="h-3 w-3" /> Verrouiller
                    </label>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display text-xl text-sage-deep">Nouvelle table</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom / numéro *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex. T13, Table A..." className="mt-1.5" />
            </div>
            <div>
              <Label>Zone</Label>
              <Select value={form.zone} onValueChange={(v) => setForm(f => ({ ...f, zone: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="groom">Côté de l'homme</SelectItem>
                  <SelectItem value="bride">Côté de la femme</SelectItem>
                  <SelectItem value="common">Zone commune</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Capacité (chaises)</Label>
                <Input type="number" min={1} max={20} value={form.capacity} onChange={(e) => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))} className="mt-1.5" />
              </div>
              <div>
                <Label>Forme</Label>
                <Select value={form.shape} onValueChange={(v) => setForm(f => ({ ...f, shape: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round">Ronde</SelectItem>
                    <SelectItem value="rect">Rectangulaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={create} loading={creating} loadingText="Creation..." className="bg-sage-deep hover:bg-sage-deep/90">
              <Plus className="mr-2 h-4 w-4" /> Créer la table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
