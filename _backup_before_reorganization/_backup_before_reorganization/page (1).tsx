"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Search, MoreHorizontal, CheckCircle2, XCircle, RefreshCw, Trash2,
  ExternalLink, Armchair, QrCode, Eye, Filter, Download, ChevronLeft, ChevronRight,
  RotateCcw, UserCheck, MessageCircle, Loader2, FileSpreadsheet, UserX,
} from "lucide-react";
import Link from "next/link";

interface Guest {
  id: string;
  code: string;
  qrCode: string;
  publicToken: string;
  type: string;
  side: string;
  status: string;
  assignmentState: string;
  presenceState: string;
  seatCount: number;
  displayName: string;
  members: any[];
  whatsapp: string;
  email: string | null;
  comment: string | null;
  table: string | null;
  tableId: string | null;
  seatCodes: string[];
  createdAt: string;
  validatedAt: string | null;
  arrivedAt: string | null;
  lastGeneratedAt: string | null;
}

interface TableOpt { id: string; name: string; zone: string; capacity: number; free: number; }

const STATUS_FILTERS = [
  { value: "all", label: "Tous les statuts" },
  { value: "pending", label: "En attente" },
  { value: "active", label: "Actives" },
  { value: "cancelled", label: "Annulées" },
  { value: "rejected", label: "Refusées" },
];

export default function GuestsPage() {
  const [items, setItems] = useState<Guest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "all", type: "all", side: "all", presence: "all" });
  const [selected, setSelected] = useState<Guest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [tables, setTables] = useState<TableOpt[]>([]);
  const [confirm, setConfirm] = useState<{ type: string; guest: Guest } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const cleanFilters = {
      status: filters.status === "all" ? "" : filters.status,
      type: filters.type === "all" ? "" : filters.type,
      side: filters.side === "all" ? "" : filters.side,
      presence: filters.presence === "all" ? "" : filters.presence,
    };
    const params = new URLSearchParams({ page: String(page), perPage: String(perPage), search, ...cleanFilters });
    const res = await fetch(`/api/guests?${params}`, { cache: "no-store" });
    if (res.ok) {
      const d = await res.json();
      setItems(d.items);
      setTotal(d.total);
      setTotalPages(d.totalPages);
    }
    setLoading(false);
  }, [page, perPage, search, filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/tables", { cache: "no-store" }).then(r => r.json()).then(d => {
      if (d.tables) setTables(d.tables.map((t: any) => ({ id: t.id, name: t.name, zone: t.zone, capacity: t.capacity, free: t.capacity - (t.assignments?.length || 0) })));
    });
  }, []);

  async function doAction(guest: Guest, action: string, extra?: any) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/guests/${guest.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || "Échec"); return; }
      toast.success(d.message || "Action effectuée");
      if (action === "resend_whatsapp" && d.link) {
        window.open(`https://wa.me/?text=${encodeURIComponent("Votre invitation au mariage de Shekina & Ruth : " + d.link)}`, "_blank");
      }
      load();
      setConfirm(null);
    } catch { toast.error("Erreur réseau"); }
    finally { setActionLoading(false); }
  }

  function exportCsv() {
    const headers = ["Code", "Code QR", "Type", "Nom", "WhatsApp", "Email", "Côté", "Table", "Chaises", "Statut", "Présence", "Créé le"];
    const rows = items.map(g => [g.code, g.qrCode, g.type, g.displayName, g.whatsapp, g.email ?? "", g.side, g.table ?? "", g.seatCodes.join(" "), g.status, g.presenceState, new Date(g.createdAt).toLocaleString("fr-FR")]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "invites-SR.csv";
    a.click();
    toast.success("Export CSV téléchargé");
  }

  async function exportFullExcel(type: string) {
    try {
      const res = await fetch(`/api/exports?format=csv&type=${type}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Échec");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `invites-SR-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      toast.success(`Export ${type} téléchargé`);
    } catch {
      toast.error("Échec de l'export");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-sage-deep sm:text-3xl">Gestion des invités</h1>
          <p className="text-sm text-muted-foreground">{total} invitation(s) · page {page}/{totalPages || 1}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportCsv} variant="outline" size="sm" className="border-gold/40 text-sage-deep hover:bg-gold/10">
            <Download className="mr-1 h-3.5 w-3.5" /> Page courante
          </Button>
          <Button onClick={() => exportFullExcel("all")} variant="outline" size="sm" className="border-gold/40 text-sage-deep hover:bg-gold/10">
            <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Excel (tous)
          </Button>
          <Button onClick={() => exportFullExcel("present")} variant="outline" size="sm" className="border-emerald-400 text-emerald-700 hover:bg-emerald-50">
            <UserCheck className="mr-1 h-3.5 w-3.5" /> Présents
          </Button>
          <Button onClick={() => exportFullExcel("absent")} variant="outline" size="sm" className="border-amber-400 text-amber-700 hover:bg-amber-50">
            <UserX className="mr-1 h-3.5 w-3.5" /> Absents
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Rechercher nom, code, WhatsApp..." className="pl-9" />
          </div>
          <Select value={filters.status} onValueChange={(v) => { setFilters(f => ({ ...f, status: v })); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>{STATUS_FILTERS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.type} onValueChange={(v) => { setFilters(f => ({ ...f, type: v })); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              <SelectItem value="individual">Individuel</SelectItem>
              <SelectItem value="couple">Couple</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.side} onValueChange={(v) => { setFilters(f => ({ ...f, side: v })); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Côté" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous côtés</SelectItem>
              <SelectItem value="groom">Homme</SelectItem>
              <SelectItem value="bride">Femme</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto scrollbar-elegant">
          <table className="w-full text-sm">
            <thead className="bg-ivory/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-3 text-left">Code</th>
                <th className="px-3 py-3 text-left">Nom</th>
                <th className="px-3 py-3 text-left hidden md:table-cell">Type</th>
                <th className="px-3 py-3 text-left hidden lg:table-cell">Côté</th>
                <th className="px-3 py-3 text-left">Table / Places</th>
                <th className="px-3 py-3 text-left hidden md:table-cell">Statut</th>
                <th className="px-3 py-3 text-left hidden lg:table-cell">Présence</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/15">
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-3 py-3"><Skeleton className="h-8" /></td></tr>
              ))}
              {!loading && items.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">Aucune invitation trouvée.</td></tr>
              )}
              {!loading && items.map((g) => (
                <tr key={g.id} className="hover:bg-ivory/40 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-xs text-sage-deep">{g.code}</td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-sage-deep">{g.displayName}</p>
                    <p className="text-xs text-muted-foreground">{g.whatsapp}{g.email ? ` · ${g.email}` : ""}</p>
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    <Badge variant="outline" className="border-gold/40 text-gold text-[10px]">{g.type === "couple" ? "Couple" : "Indiv."}</Badge>
                  </td>
                  <td className="px-3 py-2.5 hidden lg:table-cell text-xs">{g.side === "groom" ? "Homme" : "Femme"}</td>
                  <td className="px-3 py-2.5">
                    {g.table ? (
                      <div>
                        <p className="font-medium text-sage-deep">{g.table}</p>
                        <p className="text-xs text-muted-foreground font-mono">{g.seatCodes.join(", ")}</p>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">Non placé</span>}
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell"><StatusPill status={g.status} /></td>
                  <td className="px-3 py-2.5 hidden lg:table-cell"><PresencePill state={g.presenceState} /></td>
                  <td className="px-3 py-2.5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => { setSelected(g); setDetailOpen(true); }}><Eye className="mr-2 h-4 w-4" /> Consulter</DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href={`/i/${g.publicToken}`} target="_blank"><ExternalLink className="mr-2 h-4 w-4" /> Voir invitation</Link></DropdownMenuItem>
                        {g.status === "pending" && (
                          <DropdownMenuItem onClick={() => doAction(g, "validate")}><CheckCircle2 className="mr-2 h-4 w-4" /> Valider</DropdownMenuItem>
                        )}
                        {(g.status === "active" || g.status === "pending") && (
                          <DropdownMenuItem onClick={() => setConfirm({ type: "cancel", guest: g })} className="text-amber-700"><XCircle className="mr-2 h-4 w-4" /> Annuler</DropdownMenuItem>
                        )}
                        {g.status === "pending" && (
                          <DropdownMenuItem onClick={() => setConfirm({ type: "reject", guest: g })} className="text-destructive"><XCircle className="mr-2 h-4 w-4" /> Refuser</DropdownMenuItem>
                        )}
                        {(g.status === "cancelled" || g.status === "rejected") && (
                          <DropdownMenuItem onClick={() => doAction(g, "reactivate")}><RotateCcw className="mr-2 h-4 w-4" /> Réactiver</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => doAction(g, "regenerate")}><RefreshCw className="mr-2 h-4 w-4" /> Régénérer PDF/QR</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => doAction(g, "resend_whatsapp")}><MessageCircle className="mr-2 h-4 w-4" /> Lien WhatsApp</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => doAction(g, "mark_present")}><UserCheck className="mr-2 h-4 w-4" /> Marquer présent</DropdownMenuItem>
                        {g.presenceState !== "not_arrived" && (
                          <DropdownMenuItem onClick={() => doAction(g, "reset_presence")}><RotateCcw className="mr-2 h-4 w-4" /> Réinit. présence</DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setConfirm({ type: "delete", guest: g })} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gold/15 px-4 py-3">
          <p className="text-xs text-muted-foreground">{(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} sur {total}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-xs text-muted-foreground">{page} / {totalPages || 1}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-sage-deep">{selected?.displayName}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Code" value={selected.code} mono />
                <Info label="Type" value={selected.type === "couple" ? "Couple" : "Individuel"} />
                <Info label="Côté" value={selected.side === "groom" ? "Homme" : "Femme"} />
                <Info label="Statut" value={selected.status} />
                <Info label="Table" value={selected.table ?? "Non placé"} />
                <Info label="Places" value={selected.seatCodes.join(", ") || "—"} />
                <Info label="WhatsApp" value={selected.whatsapp} />
                <Info label="Email" value={selected.email ?? "—"} />
              </div>
              {selected.members.map((m, i) => (
                <div key={m.id} className="rounded-lg border border-gold/20 bg-ivory/40 p-2">
                  <p className="text-xs text-muted-foreground">Personne {i + 1}</p>
                  <p className="font-medium text-sage-deep">{m.firstName} {m.middleName ?? ""} {m.lastName} {m.arrived && <Badge className="ml-2 bg-emerald-100 text-emerald-700">Arrivé</Badge>}</p>
                </div>
              ))}
              {selected.comment && <div className="rounded-lg bg-ivory/40 p-2 text-xs"><span className="text-muted-foreground">Commentaire : </span>{selected.comment}</div>}
              <div className="rounded-lg bg-ivory/40 p-2 text-xs text-muted-foreground">
                Créée le {new Date(selected.createdAt).toLocaleString("fr-FR")}
                {selected.validatedAt && ` · validée le ${new Date(selected.validatedAt).toLocaleString("fr-FR")}`}
                {selected.arrivedAt && ` · arrivée le ${new Date(selected.arrivedAt).toLocaleString("fr-FR")}`}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" asChild><Link href={`/i/${selected?.publicToken}`} target="_blank">Voir invitation</Link></Button>
            <Button onClick={() => setDetailOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-sage-deep">
              {confirm?.type === "delete" ? "Supprimer l'invitation ?" : confirm?.type === "cancel" ? "Annuler l'invitation ?" : "Refuser l'invitation ?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirm?.type === "delete"
              ? `Cette action supprimera définitivement l'invitation de ${confirm?.guest.displayName} et libérera ses places.`
              : confirm?.type === "cancel"
              ? `L'invitation de ${confirm?.guest.displayName} sera annulée et ses places libérées.`
              : `La demande de ${confirm?.guest.displayName} sera refusée.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>Annuler</Button>
            <Button
              variant={confirm?.type === "delete" ? "destructive" : "default"}
              disabled={actionLoading}
              onClick={() => confirm && (confirm.type === "delete" ? doAction(confirm.guest, "delete") : doAction(confirm.guest, confirm.type))}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-ivory/40 p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-sm text-sage-deep ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-300",
    active: "bg-emerald-100 text-emerald-700 border-emerald-300",
    approved: "bg-emerald-100 text-emerald-700 border-emerald-300",
    cancelled: "bg-gray-100 text-gray-600 border-gray-300",
    rejected: "bg-red-100 text-red-700 border-red-300",
    expired: "bg-gray-100 text-gray-600 border-gray-300",
  };
  const label: Record<string, string> = { pending: "En attente", active: "Active", approved: "Validée", cancelled: "Annulée", rejected: "Refusée", expired: "Expirée" };
  return <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${map[status] ?? map.pending}`}>{label[status] ?? status}</span>;
}

function PresencePill({ state }: { state: string }) {
  const map: Record<string, string> = {
    not_arrived: "bg-gray-100 text-gray-600 border-gray-300",
    partially_arrived: "bg-amber-100 text-amber-700 border-amber-300",
    arrived: "bg-emerald-100 text-emerald-700 border-emerald-300",
    refused_entry: "bg-red-100 text-red-700 border-red-300",
  };
  const label: Record<string, string> = { not_arrived: "Absent", partially_arrived: "Partiel", arrived: "Arrivé", refused_entry: "Refusé" };
  return <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${map[state] ?? map.not_arrived}`}>{label[state] ?? state}</span>;
}
