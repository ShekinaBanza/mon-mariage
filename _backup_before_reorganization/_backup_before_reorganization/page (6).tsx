"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, User, UserCheck, Armchair, Heart, Scissors,
  Clock, CheckCircle2, XCircle, AlertCircle, Activity,
  TrendingUp, Percent, DoorOpen, Timer,
} from "lucide-react";
import { INVITATION_STATUS_LABELS, PRESENCE_LABELS } from "@/lib/constants";

interface DashboardData {
  totalInvitations: number;
  individualCount: number;
  coupleCount: number;
  totalPeople: number;
  totalSeats: number;
  occupiedSeats: number;
  freeSeats: number;
  groomCount: number;
  brideCount: number;
  arrivedPeople: number;
  pendingCount: number;
  rejectedCount: number;
  cancelledCount: number;
  activeCount: number;
  fullTables: number;
  partialTables: number;
  emptyTables: number;
  fillRate: number;
  presenceRate: number;
  recentScans: { id: string; result: string; at: string; name: string }[];
  recentRegistrations: { id: string; code: string; type: string; status: string; table: string | null; name: string; createdAt: string }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(load, 8000); // refresh every 8s
    return () => clearInterval(id);
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-sage-deep sm:text-3xl">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble en temps réel · actualisation toutes les 8s</p>
        </div>
        <Badge variant="outline" className="border-sage/40 text-sage-deep">
          <span className="mr-1.5 flex h-2 w-2 animate-pulse rounded-full bg-sage" /> En direct
        </Badge>
      </div>

      {/* Main KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={<Users className="h-5 w-5" />} label="Invitations totales" value={data.totalInvitations} sub={`${data.activeCount} actives`} tone="sage" />
        <KpiCard icon={<Heart className="h-5 w-5" />} label="Personnes invitées" value={data.totalPeople} sub={`${data.individualCount} indiv. · ${data.coupleCount} couples`} tone="gold" />
        <KpiCard icon={<Armchair className="h-5 w-5" />} label="Places occupées" value={`${data.occupiedSeats}/${data.totalSeats}`} sub={`${data.freeSeats} libres`} tone="sage" progress={data.fillRate} progressLabel="Taux de remplissage" />
        <KpiCard icon={<UserCheck className="h-5 w-5" />} label="Personnes présentes" value={data.arrivedPeople} sub={`${data.totalPeople - data.arrivedPeople} absentes`} tone="gold" progress={data.presenceRate} progressLabel="Taux de présence" />
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat icon={<User className="h-4 w-4" />} label="Côté homme" value={data.groomCount} color="text-sage-deep" />
        <MiniStat icon={<User className="h-4 w-4" />} label="Côté femme" value={data.brideCount} color="text-gold-deep" />
        <MiniStat icon={<Clock className="h-4 w-4" />} label="En attente" value={data.pendingCount} color="text-amber-600" />
        <MiniStat icon={<XCircle className="h-4 w-4" />} label="Refusées" value={data.rejectedCount} color="text-destructive" />
        <MiniStat icon={<CheckCircle2 className="h-4 w-4" />} label="Annulées" value={data.cancelledCount} color="text-muted-foreground" />
        <MiniStat icon={<DoorOpen className="h-4 w-4" />} label="Tables pleines" value={`${data.fullTables}/${data.fullTables + data.partialTables + data.emptyTables}`} color="text-sage-deep" />
        <MiniStat icon={<Activity className="h-4 w-4" />} label="Tables partielles" value={data.partialTables} color="text-amber-600" />
        <MiniStat icon={<Armchair className="h-4 w-4" />} label="Tables vides" value={data.emptyTables} color="text-muted-foreground" />
      </div>

      {/* Charts / progress */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-display text-lg text-sage-deep">Répartition des invités</h3>
          <div className="mt-4 space-y-4">
            <BarRow label="Côté de l'homme (Shekina)" value={data.groomCount} max={Math.max(data.groomCount, data.brideCount, 1)} color="bg-sage-deep" />
            <BarRow label="Côté de la femme (Ruth)" value={data.brideCount} max={Math.max(data.groomCount, data.brideCount, 1)} color="bg-gold" />
            <BarRow label="Personnes présentes" value={data.arrivedPeople} max={Math.max(data.totalPeople, 1)} color="bg-emerald-600" />
            <BarRow label="Places occupées" value={data.occupiedSeats} max={Math.max(data.totalSeats, 1)} color="bg-sage" />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display text-lg text-sage-deep">Taux globaux</h3>
          <div className="mt-5 space-y-5">
            <Gauge label="Taux de remplissage" value={data.fillRate} color="bg-sage-deep" />
            <Gauge label="Taux de présence" value={data.presenceRate} color="bg-gold" />
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-display text-lg text-sage-deep">
            <Timer className="h-4 w-4 text-gold" /> Derniers scans
          </h3>
          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto scrollbar-elegant">
            {data.recentScans.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Aucun scan pour le moment.</p>}
            {data.recentScans.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-gold/20 bg-ivory/40 px-3 py-2">
                <div className="flex items-center gap-2">
                  <ScanBadge result={s.result} />
                  <span className="text-sm font-medium text-sage-deep">{s.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{timeAgo(s.at)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-display text-lg text-sage-deep">
            <TrendingUp className="h-4 w-4 text-gold" /> Dernières inscriptions
          </h3>
          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto scrollbar-elegant">
            {data.recentRegistrations.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Aucune inscription.</p>}
            {data.recentRegistrations.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-gold/20 bg-ivory/40 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-sage-deep">{r.name}</p>
                  <p className="text-xs text-muted-foreground">Code {r.code} · {r.table ? `Table ${r.table}` : "non placé"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  <span className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, tone, progress, progressLabel }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub: string; tone: "sage" | "gold"; progress?: number; progressLabel?: string;
}) {
  const accent = tone === "sage" ? "bg-sage-deep text-ivory" : "bg-gold text-white";
  return (
    <Card className="overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold text-sage-deep tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>{icon}</div>
      </div>
      {progress !== undefined && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{progressLabel}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}
    </Card>
  );
}

function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: React.ReactNode; color: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={`${color}`}>{icon}</div>
      <div>
        <p className="text-lg font-semibold tabular-nums text-sage-deep">{value}</p>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-sage-deep tabular-nums">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ivory">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-display text-2xl font-semibold text-sage-deep">{value}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-ivory">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ScanBadge({ result }: { result: string }) {
  const map: Record<string, { c: string; t: string }> = {
    valid: { c: "bg-emerald-100 text-emerald-700 border-emerald-300", t: "Valide" },
    already_used: { c: "bg-amber-100 text-amber-700 border-amber-300", t: "Déjà utilisé" },
    invalid: { c: "bg-red-100 text-red-700 border-red-300", t: "Invalide" },
    cancelled: { c: "bg-red-100 text-red-700 border-red-300", t: "Annulé" },
    refused: { c: "bg-red-100 text-red-700 border-red-300", t: "Refusé" },
    error: { c: "bg-gray-100 text-gray-700 border-gray-300", t: "Erreur" },
  };
  const m = map[result] ?? map.error;
  return <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${m.c}`}>{m.t}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; t: string }> = {
    pending: { c: "bg-amber-100 text-amber-700 border-amber-300", t: "En attente" },
    approved: { c: "bg-emerald-100 text-emerald-700 border-emerald-300", t: "Validée" },
    active: { c: "bg-emerald-100 text-emerald-700 border-emerald-300", t: "Active" },
    rejected: { c: "bg-red-100 text-red-700 border-red-300", t: "Refusée" },
    cancelled: { c: "bg-gray-100 text-gray-700 border-gray-300", t: "Annulée" },
    expired: { c: "bg-gray-100 text-gray-700 border-gray-300", t: "Expirée" },
  };
  const m = map[status] ?? map.pending;
  return <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${m.c}`}>{m.t}</span>;
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}
