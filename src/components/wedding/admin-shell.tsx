"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Monogram } from "./monogram";
import { FloralDivider } from "./floral-decorations";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/constants";
import { WEDDING_DATE_LABEL } from "@/lib/wedding-config";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, Armchair, Map, Settings, Printer, ScanLine,
  LogOut, Menu, X, ShieldCheck, Home, Heart, ExternalLink
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/admin/guests", label: "Invités", icon: <Users className="h-4 w-4" /> },
  { href: "/admin/tables", label: "Tables & chaises", icon: <Armchair className="h-4 w-4" /> },
  { href: "/admin/floorplan", label: "Plan de salle", icon: <Map className="h-4 w-4" /> },
  { href: "/admin/scan-logs", label: "Historique scans", icon: <ScanLine className="h-4 w-4" /> },
  { href: "/admin/settings", label: "Paramètres", icon: <Settings className="h-4 w-4" /> },
  { href: "/admin/lists", label: "Listes imprimables", icon: <Printer className="h-4 w-4" /> },
];

export function AdminShell({ user, children }: { user: { id: string; name: string; email: string; role: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth", { method: "DELETE" });
      toast.success("Déconnecté");
      router.push("/admin/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  const isActive = (href: string) => href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen bg-ivory/30">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-gold/30 bg-card transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gold/20 px-5 py-4">
            <Link href="/admin" className="flex items-center gap-2" onClick={() => setOpen(false)}>
              <Monogram size={24} className="text-gold" />
              <div>
                <p className="font-display text-sm font-semibold text-sage-deep">S &amp; R</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Administration</p>
              </div>
            </Link>
            <button onClick={() => setOpen(false)} className="lg:hidden text-muted-foreground"><X className="h-5 w-5" /></button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-elegant">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive(item.href)
                    ? "bg-sage-deep text-ivory shadow-sm"
                    : "text-foreground/80 hover:bg-ivory hover:text-sage-deep"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
            <div className="my-2 border-t border-gold/15" />
            <Link href="/scan" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground/80 hover:bg-ivory hover:text-sage-deep">
              <ScanLine className="h-4 w-4" /> Scanner les entrées <ExternalLink className="ml-auto h-3 w-3" />
            </Link>
            <Link href="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground/80 hover:bg-ivory hover:text-sage-deep">
              <Home className="h-4 w-4" /> Voir le site <ExternalLink className="ml-auto h-3 w-3" />
            </Link>
          </nav>

          <div className="border-t border-gold/20 p-3">
            <div className="rounded-lg bg-ivory/60 p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sage-deep text-xs font-semibold text-ivory">
                  {user.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-sage-deep">{user.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{ROLE_LABELS[user.role] ?? user.role}</p>
                </div>
              </div>
              <Button onClick={logout} loading={loggingOut} loadingText="Deconnexion..." variant="ghost" size="sm" className="mt-2 w-full text-xs text-muted-foreground hover:text-destructive">
                <LogOut className="mr-2 h-3 w-3" /> Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gold/20 bg-card/90 px-4 py-3 backdrop-blur lg:px-6">
          <button onClick={() => setOpen(true)} className="lg:hidden text-sage-deep"><Menu className="h-5 w-5" /></button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-gold" />
            <span className="hidden sm:inline">Session sécurisée · </span>
            <span className="font-medium text-sage-deep">{user.email}</span>
          </div>
          <Link href="/scan" target="_blank" className="hidden sm:inline-flex">
            <Button size="sm" variant="outline" className="border-gold/40 text-sage-deep hover:bg-gold/10">
              <ScanLine className="mr-2 h-3.5 w-3.5" /> Scanner
            </Button>
          </Link>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>

        <footer className="mt-auto border-t border-gold/20 bg-card/60 px-4 py-3 text-center text-xs text-muted-foreground">
          <Heart className="inline h-3 w-3 text-gold" /> S &amp; R — Mariage de Shekina &amp; Ruth · {WEDDING_DATE_LABEL}
        </footer>
      </div>
    </div>
  );
}
