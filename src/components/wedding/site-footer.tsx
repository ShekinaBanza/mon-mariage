import Link from "next/link";
import { Monogram } from "./monogram";
import { FloralDivider } from "./floral-decorations";
import { WEDDING_CONTACT_EMAIL, WEDDING_DATE_LABEL, WEDDING_WHATSAPP_CONTACT } from "@/lib/wedding-config";

/** Sticky site footer with monogram and credits. */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-gold/30 bg-ivory/60">
      <div className="mx-auto max-w-5xl px-4 py-8 text-center">
        <Monogram size={28} className="text-gold" />
        <FloralDivider className="my-4" />
        <p className="font-serif-display text-lg text-sage-deep">
          Shekina BANZA <span className="text-gold">&amp;</span> Ruth KASONGO
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {WEDDING_DATE_LABEL}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <a href={`mailto:${WEDDING_CONTACT_EMAIL}`} className="hover:text-gold transition-colors">{WEDDING_CONTACT_EMAIL}</a>
          <span className="text-gold/40">·</span>
          <a href={`https://wa.me/${WEDDING_WHATSAPP_CONTACT.replace("+", "")}`} className="hover:text-gold transition-colors">{WEDDING_WHATSAPP_CONTACT}</a>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-gold transition-colors">Accueil</Link>
          <span className="text-gold/40">·</span>
          <Link href="/register" className="hover:text-gold transition-colors">Recevoir mon invitation</Link>
          <span className="text-gold/40">·</span>
          <Link href="/find" className="hover:text-gold transition-colors">Consulter mon invitation</Link>
          <span className="text-gold/40">·</span>
          <Link href="/admin/login" className="hover:text-gold transition-colors">Espace équipe</Link>
        </div>
        <p className="mt-6 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
          Fait avec amour · Invitation électronique S &amp; R
        </p>
      </div>
    </footer>
  );
}
