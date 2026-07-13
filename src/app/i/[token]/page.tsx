import { db } from "@/lib/db";
import { getPublicSettings, getDisplayNames } from "@/lib/settings";
import { generateQrCodeDataUrl } from "@/lib/qr";
import { renderInvitationSvg } from "@/lib/invitation-render";
import { Monogram } from "@/components/wedding/monogram";
import { FloralDivider, FloralCorner } from "@/components/wedding/floral-decorations";
import { SiteFooter } from "@/components/wedding/site-footer";
import { InvitationActions } from "@/components/wedding/invitation-actions";
import { INVITATION_STATUS, INVITATION_STATUS_LABELS, TABLE_ZONE_LABELS } from "@/lib/constants";
import type { Metadata } from "next";
import { AlertTriangle, Clock, MapPin, Gift, Calendar, QrCode, ShieldCheck, Users, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PUBLIC_BASE_URL,
  WEDDING_SOCIAL_IMAGE_PATH,
  trimTrailingSlash,
} from "@/lib/wedding-config";
import { formatWeddingDateLabel } from "@/lib/date-format";

export const dynamic = "force-dynamic";

function baseUrl(reqUrl?: string) {
  return trimTrailingSlash(process.env.NEXT_PUBLIC_BASE_URL || PUBLIC_BASE_URL);
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const inv = await db.invitation.findUnique({ where: { publicToken: token }, include: { members: true } });
  const s = await getPublicSettings();
  const weddingDateLabel = formatWeddingDateLabel(s.weddingDate);
  const ogUrl = `${baseUrl()}/i/${token}`;
  const ogImage = `${baseUrl()}${WEDDING_SOCIAL_IMAGE_PATH}`;
  const names = getDisplayNames(s);

  if (!inv) {
    return {
      title: "Invitation introuvable — S & R",
      description: "Le lien d'invitation est invalide ou a expiré.",
      openGraph: { title: "Invitation S & R", description: "Invitation introuvable.", url: ogUrl, images: [{ url: ogImage, width: 1200, height: 630 }], type: "website" },
      twitter: { card: "summary_large_image", title: "Invitation S & R", description: "Invitation introuvable.", images: [ogImage] },
    };
  }

  const displayName =
    inv.type === "couple" && inv.members.length === 2
      ? `${inv.members[0].firstName} ${inv.members[0].lastName} & ${inv.members[1].firstName} ${inv.members[1].lastName}`
      : `${inv.members[0].firstName} ${inv.members[0].lastName}`;

  const title = `Invitation S & R — ${displayName}`;
  const description = `Vous êtes invité(e) au mariage de ${names.groomFull} & ${names.brideFull}, prévu le ${weddingDateLabel.toLowerCase()}. Consultez et téléchargez votre invitation personnelle.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: ogUrl,
      siteName: "S & R — Mariage",
      images: [{ url: ogImage, width: 1200, height: 630, alt: `Invitation S & R — Mariage de ${names.coupleShort}` }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await db.invitation.findUnique({
    where: { publicToken: token },
    include: { guest: true, members: true, table: true, assignments: { include: { seat: true } } },
  });
  const s = await getPublicSettings();
  const names = getDisplayNames(s);
  const weddingDateLabel = formatWeddingDateLabel(s.weddingDate);
  const origin = baseUrl();

  // ===== ERROR STATES =====
  if (!inv) {
    return <ErrorState title="Invitation introuvable" message="Ce lien d'invitation est invalide ou a été désactivé. Vérifiez le lien ou contactez l'organisateur." icon="invalid" />;
  }
  if (inv.status === INVITATION_STATUS.CANCELLED) {
    return <ErrorState title="Invitation annulée" message={`Cette invitation a été annulée${inv.cancelledReason ? ` : ${inv.cancelledReason}` : "."} Pour toute question, contactez l'organisateur.`} icon="cancelled" />;
  }
  if (inv.status === INVITATION_STATUS.REJECTED) {
    return <ErrorState title="Invitation refusée" message="Cette demande d'invitation n'a pas été validée par l'organisateur." icon="cancelled" />;
  }
  if (inv.status === INVITATION_STATUS.PENDING) {
    return <ErrorState title="Invitation en attente de validation" message="Votre demande a bien été enregistrée. Elle est en attente de validation par l'organisateur. Vous recevrez votre invitation définitive dès validation." icon="pending" />;
  }
  if (inv.status === INVITATION_STATUS.EXPIRED) {
    return <ErrorState title="Invitation expirée" message="Cette invitation a expiré." icon="invalid" />;
  }

  // ===== VALID INVITATION =====
  const isCouple = inv.type === "couple" && inv.members.length === 2;
  const displayName = isCouple
    ? `${inv.members[0].firstName} ${inv.members[0].lastName} & ${inv.members[1].firstName} ${inv.members[1].lastName}`
    : `${inv.members[0].firstName} ${inv.members[0].middleName ? inv.members[0].middleName + " " : ""}${inv.members[0].lastName}`;

  const mention = isCouple
    ? "Couple"
    : inv.members[0].sex === "female"
    ? "Madame / Mademoiselle"
    : "Monsieur";

  const invitationSvg = await renderInvitationSvg(inv.id);
  const seatCodes = inv.assignments.map((a) => a.seat.code).sort();
  const qrDataUrl = await generateQrCodeDataUrl(inv.qrCode);

  const shareText = `Vous êtes invité(e) au mariage de ${names.coupleShort}, prévu le ${weddingDateLabel.toLowerCase()}. Consultez et téléchargez votre invitation personnelle ici :`;

  return (
    <main className="relative flex min-h-screen flex-col bg-background paper-texture">
      <FloralCorner className="pointer-events-none absolute left-2 top-2 text-sage/40" size={120} />
      <FloralCorner className="pointer-events-none absolute right-2 top-2 text-sage/40" size={120} flip />

      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        {/* Header */}
        <div className="text-center">
          <Link href="/"><Monogram size={40} className="text-gold" /></Link>
          <p className="mt-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">Votre invitation personnelle</p>
          <FloralDivider className="my-4" />
        </div>

        {/* ===== INVITATION CARD ===== */}
        <div
          className="overflow-hidden rounded-3xl border-2 border-gold/40 bg-card shadow-xl [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: invitationSvg }}
        />
        <div className="hidden relative overflow-hidden rounded-3xl border-2 border-gold/40 bg-gradient-to-br from-card to-ivory/40 shadow-xl">
          {/* Inner border */}
          <div className="pointer-events-none absolute inset-3 rounded-2xl border border-gold/30" />
          {/* Corner florals */}
          <FloralCorner className="pointer-events-none absolute left-1 top-1 text-sage/50" size={90} />
          <FloralCorner className="pointer-events-none absolute right-1 top-1 text-sage/50" size={90} flip />
          <FloralCorner className="pointer-events-none absolute bottom-1 left-1 text-sage/50" size={90} />
          <FloralCorner className="pointer-events-none absolute bottom-1 right-1 text-sage/50" size={90} flip />

          <div className="relative p-6 sm:p-10">
            {/* Monogram + names */}
            <div className="text-center">
              <div className="flex justify-center text-gold"><Monogram size={48} variant="ring" /></div>
              <p className="mt-5 text-xs uppercase tracking-[0.35em] text-muted-foreground">{s.eventTitle}</p>
              <div className="mt-4">
                <p className="font-serif-display text-4xl font-light text-sage-deep sm:text-5xl">{s.groomFirstName}</p>
                <p className="my-1 font-display text-2xl text-gold">&amp;</p>
                <p className="font-serif-display text-4xl font-light text-sage-deep sm:text-5xl">{s.brideFirstName}</p>
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">{names.groomFull} · {names.brideFull}</p>
            </div>

            <FloralDivider className="my-7" />

            {/* Guest + table (landscape split) */}
            <div className="grid gap-7 sm:grid-cols-2">
              {/* LEFT: guest + QR + code */}
              <div className="flex flex-col items-center sm:items-start">
                <p className="text-[11px] uppercase tracking-[0.25em] text-gold">Cette invitation est adressée à</p>
                <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">{mention}</p>
                <p className="font-display text-2xl font-semibold text-sage-deep sm:text-3xl">{displayName}</p>

                <div className="mt-6 flex w-full items-start gap-4">
                  {/* QR */}
                  <div className="relative shrink-0 rounded-xl border border-gold/30 bg-white p-2 shadow-sm">
                    <img src={qrDataUrl} alt="QR code d'invitation" width={140} height={140} className="rounded" />
                    <div className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-gold text-white shadow">
                      <QrCode className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Code QR</p>
                    <p className="font-mono text-lg font-semibold text-sage-deep">{inv.qrCode}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-gold">Code de secours</p>
                    <p className="font-mono text-sm font-semibold text-sage-deep">{inv.code}</p>
                    <p className="mt-1 text-xs text-muted-foreground">À présenter si le QR code est illisible.</p>
                  </div>
                </div>

                {/* Table & seats */}
                <div className="mt-6 w-full rounded-xl border border-gold/30 bg-ivory/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Votre table</p>
                      <p className="font-display text-2xl font-semibold text-sage-deep">{inv.table?.name ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Côté</p>
                      <p className="text-sm font-medium text-sage-deep">{inv.side === "groom" ? "Homme" : "Femme"}</p>
                    </div>
                  </div>
                  {s.showSeatsOnInvitation && seatCodes.length > 0 && (
                    <div className="mt-3 border-t border-gold/20 pt-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Places attribuées</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {seatCodes.map((c) => (
                          <span key={c} className="rounded-md bg-sage-deep/10 px-2 py-1 font-mono text-xs font-semibold text-sage-deep">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: ceremony / reception / text */}
              <div>
                <div className="rounded-xl border border-gold/30 bg-card/60 p-4">
                  <div className="flex items-center gap-2 text-gold">
                    <Calendar className="h-4 w-4" />
                    <p className="text-[11px] uppercase tracking-[0.2em]">Date</p>
                  </div>
                  <p className="mt-1 font-display text-lg font-semibold text-sage-deep">{weddingDateLabel}</p>
                </div>

                <div className="mt-3 space-y-3">
                  <InfoRow icon={<MapPin className="h-4 w-4" />} title="Cérémonie religieuse" lines={[s.ceremonyAddress, `Dès ${s.ceremonyTime}`]} />
                  <InfoRow icon={<Gift className="h-4 w-4" />} title="Réception" lines={[s.receptionAddress, `Dès ${s.receptionTime}`]} />
                </div>

                <div className="mt-4 rounded-xl border border-gold/20 bg-ivory/30 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Mot des mariés</p>
                  <p className="mt-2 font-serif-display text-sm leading-relaxed text-foreground/85">{s.invitationText}</p>
                  <p className="mt-3 font-serif-display text-sm italic text-muted-foreground">{s.closingSignature}</p>
                </div>

                {s.giftMessage && (
                  <div className="mt-3 rounded-xl border border-gold/20 bg-ivory/30 p-4">
                    <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-gold"><Gift className="h-3.5 w-3.5" /> Cadeaux</p>
                    <p className="mt-1 font-serif-display text-sm italic text-muted-foreground">{s.giftMessage}</p>
                  </div>
                )}
              </div>
            </div>

            <FloralDivider className="my-7" />

            {/* Footer of card */}
            <div className="text-center">
              <p className="font-serif-display text-lg italic text-muted-foreground">« {s.romanticPhrase} »</p>
              <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-gold" /> Invitation vérifiable · code {inv.code}
              </p>
            </div>
          </div>
        </div>

        {/* ===== ACTIONS ===== */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            {isCouple ? <Users className="h-5 w-5 text-gold" /> : <User className="h-5 w-5 text-gold" />}
            <h2 className="font-display text-xl text-sage-deep">Télécharger &amp; partager</h2>
          </div>
          <InvitationActions
            token={inv.publicToken}
            code={inv.code}
            displayName={displayName}
            baseUrl={origin}
            shareText={shareText}
          />
        </div>

        {/* Maps */}
        {s.mapsLink && (
          <div className="mt-6 text-center">
            <a href={s.mapsLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-sage-deep underline-offset-4 hover:text-gold hover:underline">
              <MapPin className="h-4 w-4" /> Voir l'itinéraire sur Google Maps
            </a>
          </div>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}

function InfoRow({ icon, title, lines }: { icon: React.ReactNode; title: string; lines: string[] }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gold/30 bg-card/60 p-4">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ivory text-gold">{icon}</div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold">{title}</p>
        {lines.map((l, i) => (
          <p key={i} className={i === 0 ? "font-serif-display text-base text-foreground/90" : "flex items-center gap-1 text-sm text-muted-foreground"}>
            {i === 1 && <Clock className="h-3 w-3" />}{l}
          </p>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ title, message, icon }: { title: string; message: string; icon: "invalid" | "cancelled" | "pending" }) {
  const color = icon === "pending" ? "text-amber-600" : "text-destructive";
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background paper-texture px-4 text-center">
      <FloralCorner className="pointer-events-none absolute left-2 top-2 text-sage/40" size={100} />
      <FloralCorner className="pointer-events-none absolute right-2 top-2 text-sage/40" size={100} flip />
      <div className="max-w-md">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-card border border-gold/30 ${color}`}>
          <AlertTriangle className="h-8 w-8" />
        </div>
        <Link href="/"><Monogram size={32} className="text-gold mt-6 inline-block" /></Link>
        <h1 className="mt-3 font-display text-3xl text-sage-deep">{title}</h1>
        <FloralDivider className="my-5" />
        <p className="font-serif-display text-lg text-muted-foreground">{message}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/find"><Button variant="outline">Retrouver mon invitation</Button></Link>
          <Link href="/"><Button className="bg-sage-deep hover:bg-sage-deep/90">Retour à l'accueil</Button></Link>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
