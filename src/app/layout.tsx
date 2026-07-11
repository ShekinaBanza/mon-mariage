import type { Metadata } from "next";
import { Playfair_Display, Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "S & R — Invitation au Mariage de Shekina & Ruth",
  description:
    "Vous êtes invité(e) au mariage de Shekina BANZA & Ruth KASONGO, prévu le vendredi 28 août 2026. Consultez et téléchargez votre invitation personnelle.",
  keywords: ["mariage", "invitation", "Shekina", "Ruth", "S & R", "28 août 2026"],
  authors: [{ name: "Shekina BANZA & Ruth KASONGO" }],
  openGraph: {
    title: "Invitation S & R — Mariage de Shekina & Ruth",
    description:
      "Vous êtes invité(e) au mariage de Shekina & Ruth, prévu le 28 août 2026. Consultez votre invitation personnelle.",
    url: "/",
    siteName: "S & R — Mariage",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Invitation S & R — Mariage de Shekina & Ruth",
    description:
      "Vous êtes invité(e) au mariage de Shekina & Ruth, prévu le 28 août 2026.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${playfair.variable} ${cormorant.variable} ${jost.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster position="top-center" richColors />
      </body>
    </html>
  );
}
