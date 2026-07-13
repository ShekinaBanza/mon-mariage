"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Monogram } from "@/components/wedding/monogram";
import { FloralDivider, FloralCorner } from "@/components/wedding/floral-decorations";
import { toast } from "sonner";
import { Lock, Mail, ArrowLeft, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Connexion échouée.");
        return;
      }
      toast.success("Bienvenue !");
      // Support redirect param (e.g. /admin/login?redirect=/scan)
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      router.push(redirect || (data.user?.role === "control_agent" ? "/scan" : "/admin"));
      router.refresh();
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background paper-texture px-4">
      <FloralCorner className="pointer-events-none absolute left-2 top-2 text-sage/40" size={100} />
      <FloralCorner className="pointer-events-none absolute right-2 top-2 text-sage/40" size={100} flip />

      <Card className="w-full max-w-md border-gold/40 p-8 shadow-xl">
        <div className="text-center">
          <Link href="/"><Monogram size={40} className="text-gold" /></Link>
          <p className="mt-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">Espace sécurisé</p>
          <h1 className="mt-2 font-display text-2xl text-sage-deep">Administration</h1>
          <FloralDivider className="my-4" />
        </div>

        <form onSubmit={submit} className="space-y-4" autoComplete="off">
          <div>
            <Label className="text-sm">E-mail</Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" type="email" autoComplete="off" name="sr-login-email" required />
            </div>
          </div>
          <div>
            <Label className="text-sm">Mot de passe</Label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" type="password" autoComplete="new-password" name="sr-login-password" required />
            </div>
          </div>
          <Button type="submit" loading={loading} loadingText="Connexion..." className="w-full bg-sage-deep hover:bg-sage-deep/90">
            <ShieldCheck className="mr-2 h-4 w-4" /> Se connecter
          </Button>
        </form>

        <Link href="/" className="mt-4 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-gold">
          <ArrowLeft className="h-3 w-3" /> Retour au site
        </Link>
      </Card>
    </main>
  );
}
