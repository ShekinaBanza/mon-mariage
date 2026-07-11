"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monogram } from "@/components/wedding/monogram";
import { FloralDivider, FloralCorner } from "@/components/wedding/floral-decorations";
import { SiteFooter } from "@/components/wedding/site-footer";
import { toast } from "sonner";
import { User, Users, ArrowLeft, ArrowRight, Check, Sparkles, Heart, AlertCircle, Loader2 } from "lucide-react";

type Step = "type" | "form" | "loading" | "success" | "duplicate";

interface DupMatch {
  invitationId: string;
  publicToken: string;
  code: string;
  reason: string;
  displayName: string;
}

interface Result {
  publicToken: string;
  code: string;
  qrCode: string;
  status: string;
  assigned: boolean;
  table?: string;
  seats?: string[];
  message: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("type");
  const [type, setType] = useState<"individual" | "couple">("individual");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<DupMatch[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [form, setForm] = useState({
    side: "groom",
    firstName: "",
    lastName: "",
    middleName: "",
    partnerFirstName: "",
    partnerLastName: "",
    partnerMiddleName: "",
    whatsapp: "",
    email: "",
    sex: "",
    comment: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "Prénom requis";
    if (!form.lastName.trim()) e.lastName = "Nom requis";
    if (form.whatsapp.trim().length < 6) e.whatsapp = "Numéro WhatsApp valide requis";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "E-mail invalide";
    if (type === "couple") {
      if (!form.partnerFirstName.trim()) e.partnerFirstName = "Prénom requis";
      if (!form.partnerLastName.trim()) e.partnerLastName = "Nom requis";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) {
      toast.error("Veuillez corriger les champs en rouge.");
      return;
    }
    setStep("loading");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...form }),
      });
      const data = await res.json();
      if (res.status === 409 && data.error === "DUPLICATE") {
        setDuplicates(data.duplicates);
        setStep("duplicate");
        return;
      }
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de l'enregistrement.");
        setStep("form");
        return;
      }
      setResult(data);
      setStep("success");
      toast.success("Invitation enregistrée !");
    } catch {
      toast.error("Erreur réseau. Vérifiez votre connexion.");
      setStep("form");
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-background paper-texture">
      <FloralCorner className="pointer-events-none absolute left-2 top-2 text-sage/40" size={100} />
      <FloralCorner className="pointer-events-none absolute right-2 top-2 text-sage/40" size={100} flip />

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <Monogram size={40} className="text-gold" />
          </Link>
          <p className="mt-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">Invitation S &amp; R</p>
          <h1 className="mt-2 font-display text-3xl text-sage-deep sm:text-4xl">
            {step === "type" ? "Recevoir mon invitation" : step === "success" ? "Invitation confirmée" : step === "duplicate" ? "Invitation existante" : "Vos informations"}
          </h1>
          <FloralDivider className="mt-4" />
        </div>

        {/* Progress dots */}
        {(step === "form" || step === "loading") && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button onClick={() => setStep("type")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-gold">
              <span className="h-2 w-2 rounded-full bg-gold" /> Type
            </button>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="flex items-center gap-1 text-xs text-gold">
              <span className="h-2 w-2 rounded-full bg-gold ring-2 ring-gold/30" /> Coordonnées
            </span>
          </div>
        )}

        {/* ===== STEP: TYPE ===== */}
        {step === "type" && (
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <TypeCard
              selected={type === "individual"}
              onClick={() => setType("individual")}
              icon={<User className="h-8 w-8" />}
              title="Invitation individuelle"
              desc="Une personne seule, une chaise réservée."
              tag="1 place"
            />
            <TypeCard
              selected={type === "couple"}
              onClick={() => setType("couple")}
              icon={<Users className="h-8 w-8" />}
              title="Invitation pour un couple"
              desc="Deux personnes liées, deux chaises côte à côte, un seul QR code."
              tag="2 places"
            />
            <div className="sm:col-span-2 mt-2 flex items-center justify-between">
              <Link href="/">
                <Button variant="ghost" className="text-muted-foreground">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                </Button>
              </Link>
              <Button onClick={() => setStep("form")} className="bg-sage-deep hover:bg-sage-deep/90">
                Continuer <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ===== STEP: FORM ===== */}
        {step === "form" && (
          <div className="mt-8 space-y-6">
            {/* Side selector */}
            <Card className="p-5">
              <Label className="text-sm font-medium text-sage-deep">Côté d'invitation</Label>
              <RadioGroup
                value={form.side}
                onValueChange={(v) => set("side", v)}
                className="mt-3 grid grid-cols-2 gap-3"
              >
                <SideOption value="groom" label="Invité de l'homme" desc="Côté Shekina" selected={form.side === "groom"} />
                <SideOption value="bride" label="Invité de la femme" desc="Côté Ruth" selected={form.side === "bride"} />
              </RadioGroup>
            </Card>

            {/* Person 1 */}
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sage-deep text-xs text-ivory">1</span>
                <h3 className="font-display text-lg text-sage-deep">
                  {type === "couple" ? "Première personne" : "Votre identité"}
                </h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Prénom *" error={errors.firstName}>
                  <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Jean" />
                </Field>
                <Field label="Nom *" error={errors.lastName}>
                  <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Dupont" />
                </Field>
                <Field label="Deuxième nom">
                  <Input value={form.middleName} onChange={(e) => set("middleName", e.target.value)} placeholder="(facultatif)" />
                </Field>
              </div>
              {type === "individual" && (
                <div className="mt-4">
                  <Field label="Sexe">
                    <RadioGroup value={form.sex} onValueChange={(v) => set("sex", v)} className="flex gap-6">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <RadioGroupItem value="male" /> Homme
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <RadioGroupItem value="female" /> Femme
                      </label>
                    </RadioGroup>
                  </Field>
                </div>
              )}
            </Card>

            {/* Person 2 (couple) */}
            {type === "couple" && (
              <Card className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sage-deep text-xs text-ivory">2</span>
                  <h3 className="font-display text-lg text-sage-deep">Deuxième personne</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Prénom *" error={errors.partnerFirstName}>
                    <Input value={form.partnerFirstName} onChange={(e) => set("partnerFirstName", e.target.value)} placeholder="Marie" />
                  </Field>
                  <Field label="Nom *" error={errors.partnerLastName}>
                    <Input value={form.partnerLastName} onChange={(e) => set("partnerLastName", e.target.value)} placeholder="Kabongo" />
                  </Field>
                  <Field label="Deuxième nom">
                    <Input value={form.partnerMiddleName} onChange={(e) => set("partnerMiddleName", e.target.value)} placeholder="(facultatif)" />
                  </Field>
                </div>
              </Card>
            )}

            {/* Contact */}
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Heart className="h-5 w-5 text-gold" />
                <h3 className="font-display text-lg text-sage-deep">Coordonnées</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Numéro WhatsApp *" error={errors.whatsapp}>
                  <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+243 970 000 000" />
                </Field>
                <Field label="Adresse e-mail" error={errors.email}>
                  <Input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="(facultatif)" type="email" />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Commentaire / précision">
                  <Textarea value={form.comment} onChange={(e) => set("comment", e.target.value)} placeholder="Régime alimentaire, accompagnement particulier..." rows={2} />
                </Field>
              </div>
            </Card>

            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep("type")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour
              </Button>
              <Button onClick={submit} className="bg-sage-deep hover:bg-sage-deep/90">
                <Sparkles className="mr-2 h-4 w-4" /> Recevoir mon invitation
              </Button>
            </div>
          </div>
        )}

        {/* ===== STEP: LOADING ===== */}
        {step === "loading" && (
          <div className="mt-20 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-12 w-12 animate-spin text-gold" />
            <p className="mt-4 font-serif-display text-xl text-sage-deep">Génération de votre invitation...</p>
            <p className="mt-1 text-sm text-muted-foreground">Vérification des places disponibles</p>
          </div>
        )}

        {/* ===== STEP: SUCCESS ===== */}
        {step === "success" && result && (
          <div className="mt-8">
            <Card className="overflow-hidden border-gold/40">
              <div className="bg-gradient-to-br from-sage-deep to-sage p-8 text-center text-ivory">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ivory/20 backdrop-blur">
                  <Check className="h-8 w-8" />
                </div>
                <h2 className="mt-4 font-display text-3xl">Invitation enregistrée !</h2>
                <p className="mt-2 font-serif-display text-ivory/90">{result.message}</p>
              </div>
              <div className="p-6 space-y-4">
                {result.assigned && (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <InfoTile label="Table" value={result.table ?? "—"} />
                    <InfoTile label="Places" value={(result.seats ?? []).join(", ") || "—"} />
                    <InfoTile label="Code QR" value={result.qrCode} mono />
                    <InfoTile label="Code de secours" value={result.code} mono />
                    <InfoTile label="Statut" value={result.status === "active" ? "Active" : result.status} />
                  </div>
                )}
                <div className="rounded-xl border border-gold/30 bg-ivory/50 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Votre lien personnel</p>
                  <p className="mt-1 break-all font-mono text-sm text-sage-deep">
                    {typeof window !== "undefined" ? `${window.location.origin}/i/${result.publicToken}` : `/i/${result.publicToken}`}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Button onClick={() => router.push(`/i/${result.publicToken}`)} className="bg-sage-deep hover:bg-sage-deep/90">
                    <Sparkles className="mr-2 h-4 w-4" /> Voir mon invitation
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/")}>
                    Retour à l'accueil
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ===== STEP: DUPLICATE ===== */}
        {step === "duplicate" && (
          <div className="mt-8">
            <Card className="border-amber-300/60 bg-amber-50/50 p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-1 h-6 w-6 shrink-0 text-amber-600" />
                <div>
                  <h2 className="font-display text-xl text-amber-800">Invitation déjà enregistrée</h2>
                  <p className="mt-1 text-sm text-amber-700/90">
                    Nos vérifications indiquent qu'une invitation semble déjà exister pour ces informations. Vous pouvez la consulter via le lien ci-dessous.
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {duplicates.map((d) => (
                  <div key={d.invitationId} className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-sage-deep">{d.displayName}</p>
                      <p className="text-xs text-muted-foreground">{d.reason} · code {d.code}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => router.push(`/i/${d.publicToken}`)}>
                      Consulter cette invitation
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-between">
                <Button variant="ghost" onClick={() => setStep("form")}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Modifier mes informations
                </Button>
                <Button variant="outline" onClick={() => router.push("/find")}>
                  Rechercher une invitation
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}

function TypeCard({ selected, onClick, icon, title, desc, tag }: { selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string; tag: string; }) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center rounded-2xl border-2 p-8 text-center transition-all ${
        selected ? "border-sage-deep bg-sage/5 shadow-lg shadow-sage-deep/10 -translate-y-1" : "border-gold/30 bg-card/70 hover:border-gold/60 hover:-translate-y-0.5"
      }`}
    >
      <div className={`flex h-16 w-16 items-center justify-center rounded-full transition-colors ${selected ? "bg-sage-deep text-ivory" : "bg-ivory text-gold"}`}>
        {icon}
      </div>
      <h3 className="mt-4 font-display text-xl text-sage-deep">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      <Badge variant="outline" className="mt-4 border-gold/40 text-gold">{tag}</Badge>
      {selected && (
        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-sage-deep text-ivory">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
    </button>
  );
}

function SideOption({ value, label, desc, selected }: { value: string; label: string; desc: string; selected: boolean }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all ${selected ? "border-sage-deep bg-sage/5" : "border-border hover:border-gold/50"}`}>
      <RadioGroupItem value={value} />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </label>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm text-foreground/80">{label}</Label>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function InfoTile({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-gold/30 bg-ivory/40 p-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm text-sage-deep ${mono ? "font-mono" : "font-medium"}`}>{value}</p>
    </div>
  );
}
