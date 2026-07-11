"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Monogram } from "@/components/wedding/monogram";
import { toast } from "sonner";
import jsQR from "jsqr";
import {
  ScanLine, Camera, CameraOff, Keyboard, Check, X, AlertTriangle,
  Loader2, RefreshCw, UserCheck, Users, ShieldCheck, Clock, QrCode, ArrowLeft,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { SCAN_RESULT } from "@/lib/constants";

interface ScanInvitation {
  id: string; code: string; publicToken: string; type: string; side: string;
  status: string; presenceState: string; table: string | null; seatCodes: string[];
  members: { id: string; firstName: string; lastName: string; middleName: string | null; arrived: boolean; arrivedAt: string | null }[];
  whatsapp: string; comment: string | null; cancelledReason: string | null;
}
interface ScanResponse {
  result: string; message: string; invitation?: ScanInvitation;
  firstArrival?: string; agentName?: string; reason?: string;
}

export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [fastMode, setFastMode] = useState(true);
  const lastScanRef = useRef<{ input: string; time: number } | null>(null);
  const lastFrameRef = useRef(0);
  const processingRef = useRef(false);
  const resultOpenRef = useRef(false);

  // Auth gate: scanner requires login as control_agent or higher
  const [authChecked, setAuthChecked] = useState(false);
  const [authUser, setAuthUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) {
          setAuthUser({ name: d.user.name, role: d.user.role });
        } else {
          window.location.href = "/admin/login?redirect=/scan";
        }
        setAuthChecked(true);
      })
      .catch(() => {
        window.location.href = "/admin/login?redirect=/scan";
        setAuthChecked(true);
      });
  }, []);

  useEffect(() => {
    processingRef.current = processing;
  }, [processing]);

  useEffect(() => {
    resultOpenRef.current = resultOpen;
  }, [resultOpen]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      tick();
    } catch (e: any) {
      setCameraError(e.message || "Accès caméra refusé. Utilisez la saisie manuelle.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    setScanning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  function tick() {
    if (!scanning && !videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const nowFrame = performance.now();
    if (
      video &&
      canvas &&
      video.readyState === video.HAVE_ENOUGH_DATA &&
      nowFrame - lastFrameRef.current >= 120 &&
      !processingRef.current &&
      !resultOpenRef.current
    ) {
      lastFrameRef.current = nowFrame;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
        const targetWidth = Math.min(480, video.videoWidth);
        const targetHeight = Math.round(video.videoHeight * (targetWidth / video.videoWidth));
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
        if (code && code.data) {
          // Debounce: don't scan same input within 3s
          const now = Date.now();
          if (lastScanRef.current && lastScanRef.current.input === code.data && now - lastScanRef.current.time < 3000) {
            // skip
          } else {
            lastScanRef.current = { input: code.data, time: now };
            handleInput(code.data);
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function handleInput(input: string) {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    // Brief vibration feedback on mobile
    if (navigator.vibrate) navigator.vibrate(100);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data: ScanResponse = await res.json();
      if (fastMode && data.result === SCAN_RESULT.VALID && data.invitation?.type === "individual") {
        const ok = await confirmInvitation(data.invitation.id);
        if (ok) {
          return;
        }
      }
      setResult(data);
      if (data.invitation) {
        // pre-select all not-yet-arrived members
        setSelectedMembers(new Set(data.invitation.members.filter((m) => !m.arrived).map((m) => m.id)));
      }
      setResultOpen(true);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  }

  async function submitManual() {
    if (!manualCode.trim()) { toast.error("Saisissez un code"); return; }
    setManualOpen(false);
    await handleInput(manualCode.trim());
    setManualCode("");
  }

  async function confirmInvitation(invitationId: string, refuse = false, memberIds?: string[]) {
    try {
      const body: any = { invitationId, refuse };
      if (!refuse && memberIds) body.memberIds = memberIds;
      const res = await fetch("/api/scan/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(d.message);
        return true;
      }
      toast.error(d.error);
      return false;
    } catch {
      toast.error("Erreur réseau");
      return false;
    }
  }

  async function confirmEntry(refuse = false) {
    if (!result?.invitation) return;
    processingRef.current = true;
    setProcessing(true);
    try {
      const memberIds = !refuse && result.invitation.type === "couple"
        ? Array.from(selectedMembers)
        : undefined;
      const ok = await confirmInvitation(result.invitation.id, refuse, memberIds);
      if (ok) {
        setResultOpen(false);
        setResult(null);
      }
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  }

  function closeResult() {
    setResultOpen(false);
    setResult(null);
  }

  const tone = resultTone(result?.result);

  // Auth loading state
  if (!authChecked || !authUser) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-gold" />
        <p className="mt-4 text-sm text-white/70">Vérification de l'authentification...</p>
        <p className="mt-1 text-xs text-white/40">Accès réservé aux agents autorisés</p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-slate-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2 text-white/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> <Monogram size={20} className="text-gold" />
        </Link>
        <div className="text-center">
          <p className="font-display text-sm">Contrôle des entrées</p>
          <p className="text-[10px] text-white/50">Scanner S &amp; R</p>
        </div>
        <div className="flex items-center gap-2 text-right">
          <div>
            <p className="text-[10px] text-white/50">Agent</p>
            <p className="text-xs font-medium text-gold">{authUser.name}</p>
          </div>
          <Link href="/api/auth" onClick={async (e) => { e.preventDefault(); await fetch("/api/auth", { method: "DELETE" }); window.location.href = "/admin/login"; }} className="text-white/50 hover:text-white" title="Déconnexion">
            <ShieldCheck className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center p-4">
        {/* Camera viewport */}
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border-2 border-gold/40 bg-black shadow-2xl">
          <video ref={videoRef} className="h-[60vh] max-h-[480px] w-full object-cover" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanning overlay */}
          {scanning && (
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-8 rounded-xl border-2 border-white/30" />
              <div className="absolute inset-x-8 top-1/2 h-0.5 bg-gold shadow-[0_0_12px_2px_rgba(201,169,97,0.8)] animate-pulse" />
              <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white/90">
                {processing ? "Analyse..." : "Visez le QR code"}
              </div>
            </div>
          )}

          {!scanning && (
            <div className="flex h-[60vh] max-h-[480px] flex-col items-center justify-center gap-4 p-8 text-center">
              {cameraError ? (
                <>
                  <CameraOff className="h-12 w-12 text-amber-400" />
                  <p className="text-sm text-amber-300">{cameraError}</p>
                </>
              ) : (
                <>
                  <ScanLine className="h-12 w-12 text-gold" />
                  <p className="text-sm text-white/70">Caméra arrêtée</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-6 flex w-full max-w-md flex-col gap-3">
          {!scanning ? (
            <Button onClick={startCamera} className="bg-gold text-slate-900 hover:bg-gold/90" size="lg">
              <Camera className="mr-2 h-5 w-5" /> Activer la caméra
            </Button>
          ) : (
            <Button onClick={stopCamera} variant="outline" className="border-white/30 text-white hover:bg-white/10" size="lg">
              <CameraOff className="mr-2 h-5 w-5" /> Arrêter la caméra
            </Button>
          )}
          <Button onClick={() => setManualOpen(true)} variant="outline" className="border-white/30 text-white hover:bg-white/10" size="lg">
            <Keyboard className="mr-2 h-5 w-5" /> Saisir le code manuellement
          </Button>
          <Button
            onClick={() => setFastMode((value) => !value)}
            variant="outline"
            className={fastMode ? "border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/10" : "border-white/30 text-white hover:bg-white/10"}
            size="lg"
          >
            <Zap className="mr-2 h-5 w-5" /> Mode rapide {fastMode ? "activé" : "désactivé"}
          </Button>
        </div>
      </div>

      {/* Manual entry dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-sage-deep flex items-center gap-2">
              <QrCode className="h-5 w-5 text-gold" /> Saisie manuelle du code
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Saisissez le code de secours inscrit sur l'invitation (insensible à la casse).</p>
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitManual()}
              placeholder="ex. BAN-T1-X7K9"
              className="font-mono text-lg text-center"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>Annuler</Button>
            <Button onClick={submitManual} className="bg-sage-deep hover:bg-sage-deep/90">Rechercher</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result modal */}
      <Dialog open={resultOpen} onOpenChange={(o) => !o && closeResult()}>
        <DialogContent className="max-w-md">
          {result && (
            <>
              <DialogHeader>
                <DialogTitle className={`font-display text-xl flex items-center gap-2 ${tone.text}`}>
                  <tone.icon className="h-5 w-5" /> {tone.title}
                </DialogTitle>
              </DialogHeader>

              <div className={`rounded-lg p-3 ${tone.bg}`}>
                <p className={`text-sm font-medium ${tone.text}`}>{result.message}</p>
                {result.firstArrival && (
                  <p className="mt-1 text-xs text-muted-foreground">Premier passage : {new Date(result.firstArrival).toLocaleString("fr-FR")}{result.agentName ? ` · agent ${result.agentName}` : ""}</p>
                )}
                {result.reason && <p className="mt-1 text-xs text-muted-foreground">Motif : {result.reason}</p>}
              </div>

              {result.invitation && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-gold/20 bg-ivory/40 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Invité</p>
                        <p className="font-display text-lg text-sage-deep">
                          {result.invitation.members.length === 2
                            ? `${result.invitation.members[0].firstName} ${result.invitation.members[0].lastName} & ${result.invitation.members[1].firstName} ${result.invitation.members[1].lastName}`
                            : `${result.invitation.members[0].firstName} ${result.invitation.members[0].lastName}`}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-gold/40 text-gold">{result.invitation.type === "couple" ? <Users className="mr-1 h-3 w-3" /> : <UserCheck className="mr-1 h-3 w-3" />}{result.invitation.type === "couple" ? "Couple" : "Individuel"}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <Info label="Table" value={result.invitation.table ?? "—"} />
                      <Info label="Places" value={result.invitation.seatCodes.join(", ") || "—"} />
                      <Info label="Côté" value={result.invitation.side === "groom" ? "Homme" : "Femme"} />
                      <Info label="Code" value={result.invitation.code} mono />
                    </div>
                    {result.invitation.comment && <p className="mt-2 text-xs text-muted-foreground">Note : {result.invitation.comment}</p>}
                  </div>

                  {/* Couple: select members to mark */}
                  {result.invitation.type === "couple" && result.result === SCAN_RESULT.VALID && (
                    <div className="rounded-lg border border-gold/20 p-3">
                      <p className="text-xs font-medium text-sage-deep mb-2">Personnes à enregistrer :</p>
                      <div className="space-y-2">
                        {result.invitation.members.map((m) => (
                          <label key={m.id} className={`flex items-center gap-2 rounded border p-2 cursor-pointer ${m.arrived ? "border-emerald-300 bg-emerald-50/50" : selectedMembers.has(m.id) ? "border-sage-deep bg-sage/5" : "border-border"}`}>
                            <input
                              type="checkbox"
                              checked={m.arrived || selectedMembers.has(m.id)}
                              disabled={m.arrived}
                              onChange={(e) => {
                                setSelectedMembers((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(m.id); else next.delete(m.id);
                                  return next;
                                });
                              }}
                              className="accent-sage-deep"
                            />
                            <span className="text-sm">{m.firstName} {m.lastName}</span>
                            {m.arrived && <Badge className="ml-auto bg-emerald-100 text-emerald-700 text-[10px]">Arrivé</Badge>}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={closeResult} className="sm:mr-auto">Fermer</Button>
                {result.result === SCAN_RESULT.VALID && result.invitation && (
                  <>
                    <Button variant="destructive" onClick={() => confirmEntry(true)} disabled={processing}>
                      <X className="mr-2 h-4 w-4" /> Refuser l'entrée
                    </Button>
                    <Button onClick={() => confirmEntry(false)} disabled={processing} className="bg-emerald-600 hover:bg-emerald-700">
                      {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                      Confirmer l'entrée
                    </Button>
                  </>
                )}
                {result.result === SCAN_RESULT.ALREADY_USED && (
                  <Button variant="outline" onClick={closeResult}>Compris</Button>
                )}
                {result.result === SCAN_RESULT.INVALID && (
                  <Button onClick={() => { closeResult(); setManualOpen(true); }} className="bg-sage-deep hover:bg-sage-deep/90">
                    <Keyboard className="mr-2 h-4 w-4" /> Saisir le code
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-sm text-sage-deep ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function resultTone(result?: string) {
  switch (result) {
    case SCAN_RESULT.VALID:
      return { title: "Invitation valide", icon: ShieldCheck, text: "text-emerald-700", bg: "bg-emerald-50" };
    case SCAN_RESULT.ALREADY_USED:
      return { title: "Invitation déjà contrôlée", icon: Clock, text: "text-amber-700", bg: "bg-amber-50" };
    case SCAN_RESULT.CANCELLED:
      return { title: "Accès non autorisé", icon: AlertTriangle, text: "text-red-700", bg: "bg-red-50" };
    case SCAN_RESULT.INVALID:
    default:
      return { title: "QR code invalide", icon: X, text: "text-red-700", bg: "bg-red-50" };
  }
}
