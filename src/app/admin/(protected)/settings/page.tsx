"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Save, Heart, Calendar, Palette, Settings2, ShieldCheck } from "lucide-react";

export default function SettingsPage() {
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" }).then(r => r.json()).then(d => { setS(d); setLoading(false); });
  }, []);

  function set(k: string, v: any) { setS((prev: any) => ({ ...prev, [k]: v })); }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    const d = await res.json();
    if (res.ok) toast.success("Paramètres enregistrés");
    else toast.error(d.error || "Échec");
    setSaving(false);
  }

  if (loading || !s) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-sage-deep sm:text-3xl">Paramètres du mariage</h1>
          <p className="text-sm text-muted-foreground">Configuration complète de l'événement</p>
        </div>
        <Button onClick={save} loading={saving} loadingText="Enregistrement..." className="bg-sage-deep hover:bg-sage-deep/90">
          <Save className="mr-2 h-4 w-4" /> Enregistrer
        </Button>
      </div>

      <Tabs defaultValue="identity">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
          <TabsTrigger value="identity"><Heart className="mr-1 h-3 w-3" /> Identité</TabsTrigger>
          <TabsTrigger value="event"><Calendar className="mr-1 h-3 w-3" /> Événement</TabsTrigger>
          <TabsTrigger value="texts"><Settings2 className="mr-1 h-3 w-3" /> Textes</TabsTrigger>
          <TabsTrigger value="design"><Palette className="mr-1 h-3 w-3" /> Design</TabsTrigger>
          <TabsTrigger value="rules"><ShieldCheck className="mr-1 h-3 w-3" /> Règles</TabsTrigger>
        </TabsList>

        {/* Identity */}
        <TabsContent value="identity" className="mt-4">
          <Card className="p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom du marié"><Input value={s.groomFirstName} onChange={(e) => set("groomFirstName", e.target.value)} /></Field>
              <Field label="Nom du marié"><Input value={s.groomLastName} onChange={(e) => set("groomLastName", e.target.value)} /></Field>
              <Field label="Prénom de la mariée"><Input value={s.brideFirstName} onChange={(e) => set("brideFirstName", e.target.value)} /></Field>
              <Field label="Nom de la mariée"><Input value={s.brideLastName} onChange={(e) => set("brideLastName", e.target.value)} /></Field>
              <Field label="Monogramme"><Input value={s.monogram} onChange={(e) => set("monogram", e.target.value)} /></Field>
              <Field label="Titre de l'événement"><Input value={s.eventTitle} onChange={(e) => set("eventTitle", e.target.value)} /></Field>
            </div>
          </Card>
        </TabsContent>

        {/* Event */}
        <TabsContent value="event" className="mt-4">
          <Card className="p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date du mariage">
                <Input type="date" value={(s.weddingDate || "").slice(0, 10)} onChange={(e) => set("weddingDate", e.target.value)} />
              </Field>
              <Field label="Lien Google Maps"><Input value={s.mapsLink || ""} onChange={(e) => set("mapsLink", e.target.value)} /></Field>
              <Field label="Adresse cérémonie religieuse"><Input value={s.ceremonyAddress} onChange={(e) => set("ceremonyAddress", e.target.value)} /></Field>
              <Field label="Heure cérémonie"><Input value={s.ceremonyTime} onChange={(e) => set("ceremonyTime", e.target.value)} placeholder="14h00" /></Field>
              <Field label="Adresse réception"><Input value={s.receptionAddress} onChange={(e) => set("receptionAddress", e.target.value)} /></Field>
              <Field label="Heure réception"><Input value={s.receptionTime} onChange={(e) => set("receptionTime", e.target.value)} placeholder="19h00" /></Field>
              <Field label="WhatsApp de contact"><Input value={s.whatsappContact || ""} onChange={(e) => set("whatsappContact", e.target.value)} /></Field>
              <Field label="E-mail de contact"><Input value={s.contactEmail || ""} onChange={(e) => set("contactEmail", e.target.value)} /></Field>
              <Field label="URL publique de base (pour liens WhatsApp)">
                <Input value={s.publicBaseUrl || ""} onChange={(e) => set("publicBaseUrl", e.target.value)} placeholder="https://votre-domaine.com" />
              </Field>
            </div>
          </Card>
        </TabsContent>

        {/* Texts */}
        <TabsContent value="texts" className="mt-4">
          <Card className="p-5 space-y-4">
            <Field label="Phrase romantique / biblique"><Input value={s.romanticPhrase} onChange={(e) => set("romanticPhrase", e.target.value)} /></Field>
            <Field label="Texte de l'invitation"><Textarea rows={5} value={s.invitationText} onChange={(e) => set("invitationText", e.target.value)} /></Field>
            <Field label="Message cadeaux"><Textarea rows={3} value={s.giftMessage} onChange={(e) => set("giftMessage", e.target.value)} /></Field>
            <Field label="Signature"><Input value={s.closingSignature} onChange={(e) => set("closingSignature", e.target.value)} /></Field>
            <Field label="Instructions / consignes"><Textarea rows={3} value={s.instructions || ""} onChange={(e) => set("instructions", e.target.value)} /></Field>
          </Card>
        </TabsContent>

        {/* Design */}
        <TabsContent value="design" className="mt-4">
          <Card className="p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Couleur principale (vert)">
                <div className="flex items-center gap-2"><input type="color" value={s.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} className="h-10 w-14 rounded border" /><Input value={s.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} /></div>
              </Field>
              <Field label="Couleur secondaire (doré)">
                <div className="flex items-center gap-2"><input type="color" value={s.secondaryColor} onChange={(e) => set("secondaryColor", e.target.value)} className="h-10 w-14 rounded border" /><Input value={s.secondaryColor} onChange={(e) => set("secondaryColor", e.target.value)} /></div>
              </Field>
              <Field label="Couleur accent (ivoire)">
                <div className="flex items-center gap-2"><input type="color" value={s.accentColor} onChange={(e) => set("accentColor", e.target.value)} className="h-10 w-14 rounded border" /><Input value={s.accentColor} onChange={(e) => set("accentColor", e.target.value)} /></div>
              </Field>
            </div>
            <Field label="Police d'écriture"><Input value={s.font} onChange={(e) => set("font", e.target.value)} /></Field>
            <Field label="URL du logo (optionnel)"><Input value={s.logoUrl || ""} onChange={(e) => set("logoUrl", e.target.value)} /></Field>
            <Field label="URL image sociale (optionnel)"><Input value={s.socialImageUrl || ""} onChange={(e) => set("socialImageUrl", e.target.value)} /></Field>
          </Card>
        </TabsContent>

        {/* Rules */}
        <TabsContent value="rules" className="mt-4">
          <Card className="p-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre maximal de personnes"><Input type="number" value={s.maxPeople} onChange={(e) => set("maxPeople", e.target.value)} /></Field>
              <Field label="Nombre maximal d'invitations"><Input type="number" value={s.maxInvitations} onChange={(e) => set("maxInvitations", e.target.value)} /></Field>
              <Field label="Date limite d'inscription"><Input type="datetime-local" value={s.registrationDeadline ? new Date(s.registrationDeadline).toISOString().slice(0, 16) : ""} onChange={(e) => set("registrationDeadline", e.target.value)} /></Field>
              <Field label="Format des tables">
                <Select value={s.tableFormat} onValueChange={(v) => set("tableFormat", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="numeric">Numérique (T1, T2...)</SelectItem>
                    <SelectItem value="alpha">Alphabétique (TA, TB...)</SelectItem>
                    <SelectItem value="custom">Personnalisé</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Mode de validation">
                <Select value={s.validationMode} onValueChange={(v) => set("validationMode", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automatique</SelectItem>
                    <SelectItem value="manual">Validation administrative</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="space-y-3 border-t border-gold/15 pt-4">
              <label className="flex items-center justify-between rounded-lg border border-gold/20 bg-ivory/40 p-3">
                <div><p className="font-medium text-sage-deep">Inscriptions ouvertes</p><p className="text-xs text-muted-foreground">Autoriser de nouvelles demandes d'invitation</p></div>
                <Switch checked={s.registrationOpen} onCheckedChange={(v) => set("registrationOpen", v)} />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-gold/20 bg-ivory/40 p-3">
                <div><p className="font-medium text-sage-deep">Afficher les chaises sur l'invitation</p><p className="text-xs text-muted-foreground">Afficher les codes de places (T1C1...) sur le document</p></div>
                <Switch checked={s.showSeatsOnInvitation} onCheckedChange={(v) => set("showSeatsOnInvitation", v)} />
              </label>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm text-foreground/80">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
