"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Monogram } from "./monogram";
import { FloralDivider } from "./floral-decorations";
import { WEDDING_CONTACT_EMAIL, WEDDING_DATE_LABEL, WEDDING_WHATSAPP_CONTACT } from "@/lib/wedding-config";

interface FooterSettings {
  groomFirstName: string;
  groomLastName: string;
  brideFirstName: string;
  brideLastName: string;
  monogram: string;
  weddingDateLabel: string;
  contactEmail: string | null;
  whatsappContact: string;
}

const FALLBACK_SETTINGS: FooterSettings = {
  groomFirstName: "Shekina",
  groomLastName: "BANZA",
  brideFirstName: "Ruth",
  brideLastName: "KASONGO",
  monogram: "S & R",
  weddingDateLabel: WEDDING_DATE_LABEL,
  contactEmail: WEDDING_CONTACT_EMAIL,
  whatsappContact: WEDDING_WHATSAPP_CONTACT,
};

/** Sticky site footer with monogram and credits. */
export function SiteFooter() {
  const [settings, setSettings] = useState<FooterSettings>(FALLBACK_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public-settings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setSettings({ ...FALLBACK_SETTINGS, ...data });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const email = settings.contactEmail || WEDDING_CONTACT_EMAIL;
  const whatsapp = settings.whatsappContact || WEDDING_WHATSAPP_CONTACT;
  const whatsappNumber = whatsapp.replace(/\D/g, "");

  return (
    <footer className="mt-auto border-t border-gold/30 bg-ivory/60">
      <div className="mx-auto max-w-5xl px-4 py-8 text-center">
        <Monogram size={28} className="text-gold" />
        <FloralDivider className="my-4" />
        <p className="font-serif-display text-lg text-sage-deep">
          {settings.groomFirstName} {settings.groomLastName} <span className="text-gold">&amp;</span>{" "}
          {settings.brideFirstName} {settings.brideLastName}
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {settings.weddingDateLabel || WEDDING_DATE_LABEL}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <a href={`mailto:${email}`} className="hover:text-gold transition-colors">{email}</a>
          <span className="text-gold/40">·</span>
          <a href={`https://wa.me/${whatsappNumber}`} className="hover:text-gold transition-colors">{whatsapp}</a>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-gold transition-colors">Accueil</Link>
          <span className="text-gold/40">·</span>
          <Link href="/register" className="hover:text-gold transition-colors">Recevoir mon invitation</Link>
          <span className="text-gold/40">·</span>
          <Link href="/find" className="hover:text-gold transition-colors">Consulter mon invitation</Link>
          <span className="text-gold/40">·</span>
          <Link href="/admin/login" className="hover:text-gold transition-colors">Espace equipe</Link>
        </div>
        <p className="mt-6 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
          Fait avec amour · Invitation electronique {settings.monogram || "S & R"}
        </p>
      </div>
    </footer>
  );
}
