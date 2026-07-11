import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background paper-texture px-4 text-center">
      <img
        src="/logo-wedding.png"
        alt="Mariage de Shekina & Ruth"
        className="h-16 w-36 object-contain"
      />
      <Loader2 className="mt-6 h-8 w-8 animate-spin text-gold" aria-hidden="true" />
      <p className="mt-3 text-sm text-muted-foreground">Chargement en cours...</p>
    </main>
  );
}
