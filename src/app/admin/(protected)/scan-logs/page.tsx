"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search, Clock, ChevronLeft, ChevronRight, ScanLine,
  CheckCircle2, AlertTriangle, XCircle, Activity, Download, RefreshCw,
} from "lucide-react";

interface ScanLogItem {
  id: string;
  result: string;
  input: string;
  note: string | null;
  at: string;
  ip: string | null;
  agentName: string;
  invitation: { code: string; qrCode: string; type: string; table: string | null; displayName: string } | null;
}

export default function ScanLogsPage() {
  const [items, setItems] = useState<ScanLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(30);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const cleanResult = resultFilter === "all" ? "" : resultFilter;
    const params = new URLSearchParams({ page: String(page), perPage: String(perPage), search, result: cleanResult });
    try {
      const res = await fetch(`/api/scan-logs?${params}`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setItems(d.items);
        setTotal(d.total);
        setTotalPages(d.totalPages);
      }
    } catch {
      toast.error("Erreur de chargement");
    }
    setLoading(false);
  }, [page, perPage, search, resultFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function exportCsv() {
    const headers = ["Date", "Résultat", "Entrée", "Invité", "Code", "Table", "Agent", "IP", "Note"];
    const rows = items.map((s) => [
      new Date(s.at).toLocaleString("fr-FR"),
      s.result,
      s.input,
      s.invitation?.displayName ?? "Inconnu",
      s.invitation?.code ?? "—",
      s.invitation?.table ?? "—",
      s.agentName,
      s.ip ?? "—",
      s.note ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `scans-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success("Export CSV téléchargé");
  }

  const resultStats = items.reduce((acc, s) => {
    acc[s.result] = (acc[s.result] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-sage-deep sm:text-3xl">Historique des scans</h1>
          <p className="text-sm text-muted-foreground">{total} scan(s) enregistré(s) · page {page}/{totalPages || 1}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={load} variant="outline" size="sm"><RefreshCw className="mr-1 h-3.5 w-3.5" /> Actualiser</Button>
          <Button onClick={exportCsv} variant="outline" size="sm" className="border-gold/40 text-sage-deep hover:bg-gold/10">
            <Download className="mr-1 h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Valides" value={resultStats.valid || 0} icon={<CheckCircle2 className="h-4 w-4" />} color="text-emerald-600" />
        <StatCard label="Déjà utilisés" value={resultStats.already_used || 0} icon={<Clock className="h-4 w-4" />} color="text-amber-600" />
        <StatCard label="Invalides" value={resultStats.invalid || 0} icon={<XCircle className="h-4 w-4" />} color="text-red-600" />
        <StatCard label="Annulés" value={resultStats.cancelled || 0} icon={<AlertTriangle className="h-4 w-4" />} color="text-red-600" />
        <StatCard label="Refusés" value={resultStats.refused || 0} icon={<XCircle className="h-4 w-4" />} color="text-red-600" />
        <StatCard label="Erreurs" value={resultStats.error || 0} icon={<Activity className="h-4 w-4" />} color="text-gray-600" />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Rechercher par nom, code, QR code..." className="pl-9" />
          </div>
          <Select value={resultFilter} onValueChange={(v) => { setResultFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Résultat" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les résultats</SelectItem>
              <SelectItem value="valid">Valides</SelectItem>
              <SelectItem value="already_used">Déjà utilisés</SelectItem>
              <SelectItem value="invalid">Invalides</SelectItem>
              <SelectItem value="cancelled">Annulés</SelectItem>
              <SelectItem value="refused">Refusés</SelectItem>
              <SelectItem value="error">Erreurs</SelectItem>
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
                <th className="px-3 py-3 text-left">Date & heure</th>
                <th className="px-3 py-3 text-left">Résultat</th>
                <th className="px-3 py-3 text-left">Invité</th>
                <th className="px-3 py-3 text-left hidden md:table-cell">Code / QR</th>
                <th className="px-3 py-3 text-left hidden lg:table-cell">Table</th>
                <th className="px-3 py-3 text-left hidden sm:table-cell">Agent</th>
                <th className="px-3 py-3 text-left hidden lg:table-cell">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/15">
              {loading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-3 py-3"><Skeleton className="h-8" /></td></tr>
              ))}
              {!loading && items.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">Aucun scan enregistré.</td></tr>
              )}
              {!loading && items.map((s) => (
                <tr key={s.id} className="hover:bg-ivory/40 transition-colors">
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {new Date(s.at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </td>
                  <td className="px-3 py-2.5"><ResultBadge result={s.result} /></td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-sage-deep">{s.invitation?.displayName ?? "Inconnu"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{s.input}</p>
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    {s.invitation ? (
                      <div className="space-y-0.5">
                        <p className="font-mono text-xs text-sage-deep">{s.invitation.code}</p>
                        <p className="font-mono text-[10px] text-gold">QR: {s.invitation.qrCode}</p>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2.5 hidden lg:table-cell text-sm">{s.invitation?.table ?? "—"}</td>
                  <td className="px-3 py-2.5 hidden sm:table-cell text-xs">{s.agentName}</td>
                  <td className="px-3 py-2.5 hidden lg:table-cell text-xs text-muted-foreground max-w-xs truncate">{s.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gold/15 px-4 py-3">
          <p className="text-xs text-muted-foreground">{(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} sur {total}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-xs text-muted-foreground">{page} / {totalPages || 1}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Card className="flex items-center gap-2 p-3">
      <div className={color}>{icon}</div>
      <div>
        <p className="text-xl font-semibold tabular-nums text-sage-deep">{value}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

function ResultBadge({ result }: { result: string }) {
  const map: Record<string, { c: string; t: string }> = {
    valid: { c: "bg-emerald-100 text-emerald-700 border-emerald-300", t: "Valide" },
    already_used: { c: "bg-amber-100 text-amber-700 border-amber-300", t: "Déjà utilisé" },
    invalid: { c: "bg-red-100 text-red-700 border-red-300", t: "Invalide" },
    cancelled: { c: "bg-red-100 text-red-700 border-red-300", t: "Annulé" },
    refused: { c: "bg-red-100 text-red-700 border-red-300", t: "Refusé" },
    error: { c: "bg-gray-100 text-gray-700 border-gray-300", t: "Erreur" },
  };
  const m = map[result] ?? map.error;
  return <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${m.c}`}>{m.t}</span>;
}
