"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Share2, Printer, Calendar, Copy, FileImage, FileText, MessageCircle } from "lucide-react";
import { useState } from "react";

interface ActionsProps {
  token: string;
  code: string;
  displayName: string;
  baseUrl: string;
  shareText: string;
}

export function InvitationActions({ token, code, displayName, baseUrl, shareText }: ActionsProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const url = `${baseUrl}/i/${token}`;

  async function download(format: "pdf" | "jpg" | "png") {
    setBusy(format);
    try {
      const res = await fetch(`/api/invitation/${token}/download?format=${format}`);
      if (!res.ok) throw new Error("Échec");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `invitation-SR-${code}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success(`Invitation ${format.toUpperCase()} téléchargée`);
    } catch {
      toast.error("Échec du téléchargement");
    } finally {
      setBusy(null);
    }
  }

  function shareWhatsApp() {
    const text = `${shareText}\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    fetch(`/api/invitation/${token}/share`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel: "whatsapp" }) });
    toast.success("Ouverture de WhatsApp...");
  }

  function copyLink() {
    navigator.clipboard.writeText(url);
    fetch(`/api/invitation/${token}/share`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel: "copy" }) });
    toast.success("Lien copié !");
  }

  function addToCalendar() {
    const d = new Date("2026-08-28T11:00:00");
    const end = new Date("2026-08-28T22:00:00");
    const fmt = (x: Date) => x.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ical = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nURL:${url}\nDTSTART:${fmt(d)}\nDTEND:${fmt(end)}\nSUMMARY:Mariage de Shekina & Ruth\nDESCRIPTION:Invitation de ${displayName}\nLOCATION:Paroisse Saint-Paul Carrefour\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([ical], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mariage-SR.ics";
    a.click();
    toast.success("Événement ajouté au calendrier");
  }

  function print() {
    window.print();
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Button onClick={() => download("pdf")} disabled={busy !== null} className="bg-sage-deep hover:bg-sage-deep/90">
        {busy === "pdf" ? "Génération..." : <><FileText className="mr-2 h-4 w-4" /> Télécharger PDF</>}
      </Button>
      <Button onClick={() => download("jpg")} disabled={busy !== null} variant="outline" className="border-gold/40 text-sage-deep hover:bg-gold/10">
        {busy === "jpg" ? "Génération..." : <><FileImage className="mr-2 h-4 w-4" /> Télécharger JPG</>}
      </Button>
      <Button onClick={() => download("png")} disabled={busy !== null} variant="outline" className="border-gold/40 text-sage-deep hover:bg-gold/10">
        {busy === "png" ? "Génération..." : <><FileImage className="mr-2 h-4 w-4" /> Télécharger PNG</>}
      </Button>
      <Button onClick={shareWhatsApp} className="bg-[#25D366] text-white hover:bg-[#1ebe5d]">
        <MessageCircle className="mr-2 h-4 w-4" /> Partager WhatsApp
      </Button>
      <Button onClick={copyLink} variant="outline">
        <Copy className="mr-2 h-4 w-4" /> Copier le lien
      </Button>
      <Button onClick={print} variant="outline">
        <Printer className="mr-2 h-4 w-4" /> Imprimer
      </Button>
      <Button onClick={addToCalendar} variant="outline" className="sm:col-span-2 lg:col-span-1">
        <Calendar className="mr-2 h-4 w-4" /> Ajouter au calendrier
      </Button>
    </div>
  );
}
