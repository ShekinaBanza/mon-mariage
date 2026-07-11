"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  target: string; // ISO date string
  className?: string;
}

function calc(target: number) {
  const now = Date.now();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, done: diff === 0 };
}

export function Countdown({ target, className = "" }: CountdownProps) {
  const targetMs = new Date(target).getTime();
  // Start with a stable placeholder (00) to avoid hydration mismatch —
  // the server and client would otherwise compute different values since
  // time passes between server render and client hydration.
  const [time, setTime] = useState<{ days: number; hours: number; minutes: number; seconds: number; done: boolean } | null>(null);

  useEffect(() => {
    // Compute the real value only on the client after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTime(calc(targetMs));
    const id = setInterval(() => setTime(calc(targetMs)), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const items = [
    { label: "Jours", value: time?.days ?? 0 },
    { label: "Heures", value: time?.hours ?? 0 },
    { label: "Minutes", value: time?.minutes ?? 0 },
    { label: "Secondes", value: time?.seconds ?? 0 },
  ];

  if (time?.done) {
    return (
      <div className={`text-center ${className}`}>
        <p className="font-display text-2xl text-gold">C'est aujourd'hui !</p>
        <p className="font-serif-display text-sage-deep mt-1">Que la célébration commence.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-stretch justify-center gap-3 sm:gap-4 ${className}`}>
      {items.map((it, i) => (
        <div
          key={it.label}
          className="relative flex min-w-[72px] flex-col items-center justify-center rounded-xl border border-gold/40 bg-card/70 px-3 py-3 backdrop-blur-sm sm:min-w-[96px] sm:px-5 sm:py-4"
        >
          <span className="font-display text-3xl font-semibold text-sage-deep sm:text-5xl tabular-nums">
            {String(it.value).padStart(2, "0")}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">
            {it.label}
          </span>
          {i < items.length - 1 && (
            <span className="absolute -right-[9px] top-1/2 -translate-y-1/2 text-gold/60 sm:text-xl">·</span>
          )}
        </div>
      ))}
    </div>
  );
}
