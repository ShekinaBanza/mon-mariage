import { getPublicSettings, getDisplayNames } from "@/lib/settings";
import { db } from "@/lib/db";
import { Countdown } from "@/components/wedding/countdown";
import { Monogram } from "@/components/wedding/monogram";
import { FloralCorner, FloralDivider, FloatingPetals, FloralBranch } from "@/components/wedding/floral-decorations";
import { SiteFooter } from "@/components/wedding/site-footer";
import Link from "next/link";
import { Church, MapPin, Clock, Gift, Heart, ChevronDown, Sparkles, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const s = await getPublicSettings();
  const names = getDisplayNames(s);
  const stats = await getQuickStats();

  return (
    <main className="relative flex min-h-screen flex-col bg-background paper-texture">
      <FloatingPetals count={14} />

      {/* ===== HERO ===== */}
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
        {/* Decorative corners */}
        <FloralCorner className="pointer-events-none absolute left-2 top-2 text-sage/50" size={140} />
        <FloralCorner className="pointer-events-none absolute right-2 top-2 text-sage/50" size={140} flip />
        <FloralCorner className="pointer-events-none absolute bottom-2 left-2 text-sage/50" size={140} />
        <FloralCorner className="pointer-events-none absolute bottom-2 right-2 text-sage/50" size={140} flip />

        {/* Top monogram with ring */}
        <div className="animate-fade-up text-gold" style={{ animationDelay: "0.1s" }}>
          <Monogram size={64} variant="ring" />
        </div>

        <p className="mt-8 animate-fade-up text-xs uppercase tracking-[0.4em] text-muted-foreground" style={{ animationDelay: "0.3s" }}>
          {s.eventTitle}
        </p>

        <div className="mt-6 animate-fade-up" style={{ animationDelay: "0.5s" }}>
          <h1 className="font-serif-display text-5xl font-light leading-tight text-sage-deep sm:text-7xl md:text-8xl">
            {s.groomFirstName}
          </h1>
          <div className="my-3 flex items-center justify-center gap-4">
            <span className="h-px w-12 bg-gold/60 sm:w-20" />
            <span className="font-display text-3xl text-gold sm:text-4xl">&amp;</span>
            <span className="h-px w-12 bg-gold/60 sm:w-20" />
          </div>
          <h1 className="font-serif-display text-5xl font-light leading-tight text-sage-deep sm:text-7xl md:text-8xl">
            {s.brideFirstName}
          </h1>
        </div>

        <p className="mt-8 animate-fade-up text-sm uppercase tracking-[0.3em] text-muted-foreground sm:text-base" style={{ animationDelay: "0.7s" }}>
          {names.groomFull} &nbsp;·&nbsp; {names.brideFull}
        </p>

        <FloralDivider className="my-8 animate-fade-up" />

        <p className="animate-fade-up font-display text-xl text-sage-deep sm:text-2xl" style={{ animationDelay: "0.9s" }}>
          Vendredi 28 août 2026
        </p>

        <p className="mt-3 animate-fade-up max-w-md font-serif-display text-lg italic text-muted-foreground" style={{ animationDelay: "1.1s" }}>
          « {s.romanticPhrase} »
        </p>

        {/* Countdown */}
        <div className="mt-10 animate-fade-up" style={{ animationDelay: "1.3s" }}>
          <Countdown target={s.weddingDate} />
        </div>

        {/* CTAs */}
        <div className="mt-12 flex animate-fade-up flex-col items-center gap-4 sm:flex-row sm:gap-5" style={{ animationDelay: "1.5s" }}>
          <Link
            href="/register"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-sage-deep px-8 py-4 text-sm font-medium uppercase tracking-[0.15em] text-ivory shadow-lg shadow-sage-deep/20 transition-all hover:shadow-xl hover:shadow-sage-deep/30 hover:-translate-y-0.5"
          >
            <Sparkles className="h-4 w-4" />
            Recevoir mon invitation
          </Link>
          <Link
            href="/find"
            className="inline-flex items-center gap-2 rounded-full border border-gold/50 bg-card/70 px-8 py-4 text-sm font-medium uppercase tracking-[0.15em] text-sage-deep backdrop-blur-sm transition-all hover:border-gold hover:bg-gold/10"
          >
            Consulter mon invitation
          </Link>
        </div>

        {/* Scroll hint */}
        <div className="mt-16 animate-bounce text-gold/60">
          <ChevronDown className="h-6 w-6" />
        </div>
      </section>

      {/* ===== DETAILED SECTIONS ===== */}
      <section className="relative bg-ivory/40 py-20">
        <div className="mx-auto max-w-5xl px-4">
          {/* Mot des mariés */}
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-gold">Mot des mariés</p>
            <FloralDivider className="my-5" />
            <p className="mx-auto max-w-2xl font-serif-display text-xl leading-relaxed text-foreground/90 sm:text-2xl">
              {s.invitationText}
            </p>
            <p className="mt-6 font-serif-display text-lg italic text-muted-foreground">
              {s.closingSignature}
            </p>
          </div>

          {/* Ceremony & Reception cards */}
          <div className="mt-16 grid gap-6 md:grid-cols-2">
            <InfoCard
              icon={<Church className="h-6 w-6" />}
              title="Cérémonie religieuse"
              address={s.ceremonyAddress}
              time={s.ceremonyTime}
              accent
            />
            <InfoCard
              icon={<Gift className="h-6 w-6" />}
              title="Réception"
              address={s.receptionAddress}
              time={s.receptionTime}
            />
          </div>

          {/* Gift message */}
          <div className="mt-12 rounded-2xl border border-gold/30 bg-card/80 p-8 text-center shadow-sm">
            <Gift className="mx-auto h-8 w-8 text-gold" />
            <h3 className="mt-3 font-display text-xl text-sage-deep">Cadeaux</h3>
            <p className="mx-auto mt-3 max-w-xl font-serif-display text-lg italic leading-relaxed text-muted-foreground">
              {s.giftMessage}
            </p>
          </div>

          {/* Live counter strip */}
          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatBlock label="Invités enregistrés" value={stats.totalPeople} icon={<Heart className="h-4 w-4" />} />
            <StatBlock label="Tables disponibles" value={stats.totalTables} icon={<Calendar className="h-4 w-4" />} />
            <StatBlock label="Places totales" value={stats.totalSeats} icon={<MapPin className="h-4 w-4" />} />
            <StatBlock label="Places libres" value={stats.freeSeats} icon={<Sparkles className="h-4 w-4" />} />
          </div>

          {/* Floral branch divider */}
          <div className="mt-16 flex justify-center text-sage/60">
            <FloralBranch width={280} />
          </div>

          {/* Maps link */}
          {s.mapsLink && (
            <div className="mt-8 text-center">
              <Link
                href={s.mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-sage-deep underline-offset-4 hover:text-gold hover:underline"
              >
                <MapPin className="h-4 w-4" /> Voir l'itinéraire sur Google Maps
              </Link>
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function InfoCard({
  icon,
  title,
  address,
  time,
  accent = false,
}: {
  icon: React.ReactNode;
  title: string;
  address: string;
  time: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-8 shadow-sm transition-all hover:shadow-md ${
        accent ? "border-sage/40 bg-sage/5" : "border-gold/30 bg-card/80"
      }`}
    >
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-ivory text-gold">
        {icon}
      </div>
      <h3 className="font-display text-xl text-sage-deep">{title}</h3>
      <p className="mt-2 font-serif-display text-lg text-foreground/90">{address}</p>
      <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4 text-gold" /> Dès {time}
      </p>
    </div>
  );
}

function StatBlock({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gold/30 bg-card/70 p-4 text-center">
      <div className="mx-auto mb-2 flex items-center justify-center text-gold">{icon}</div>
      <p className="font-display text-3xl text-sage-deep tabular-nums">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
    </div>
  );
}

async function getQuickStats() {
  const [totalPeople, totalTables, seatsCount, occupiedSeats] = await Promise.all([
    db.invitationMember.count(),
    db.table.count({ where: { active: true } }),
    db.seat.count(),
    db.seatAssignment.count(),
  ]);
  return {
    totalPeople,
    totalTables,
    totalSeats: seatsCount,
    freeSeats: seatsCount - occupiedSeats,
  };
}
