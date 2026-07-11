import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import {
  PUBLIC_BASE_URL,
  WEDDING_DATE_LABEL,
  WEDDING_FAVICON_PATH,
  WEDDING_SOCIAL_IMAGE_PATH,
} from "@/lib/wedding-config";

const playfair = localFont({
  variable: "--font-playfair",
  src: [
    { path: "../../public/fonts/PlayfairDisplay-400.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/PlayfairDisplay-600.ttf", weight: "600", style: "normal" },
    { path: "../../public/fonts/PlayfairDisplay-700.ttf", weight: "700", style: "normal" },
  ],
  display: "swap",
});

const cormorant = localFont({
  variable: "--font-cormorant",
  src: [
    { path: "../../public/fonts/CormorantGaramond-400.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/CormorantGaramond-500.ttf", weight: "500", style: "normal" },
    { path: "../../public/fonts/CormorantGaramond-600.ttf", weight: "600", style: "normal" },
  ],
  display: "swap",
});

const jost = localFont({
  variable: "--font-jost",
  src: [
    { path: "../../public/fonts/Jost-400.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/Jost-500.ttf", weight: "500", style: "normal" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_BASE_URL),
  title: "S & R — Invitation au Mariage de Shekina & Ruth",
  description:
    `Vous êtes invité(e) au mariage de Shekina BANZA & Ruth KASONGO, prévu le ${WEDDING_DATE_LABEL.toLowerCase()}. Consultez et téléchargez votre invitation personnelle.`,
  keywords: ["mariage", "invitation", "Shekina", "Ruth", "S & R", "29 août 2026"],
  authors: [{ name: "Shekina BANZA & Ruth KASONGO" }],
  icons: {
    icon: [{ url: WEDDING_FAVICON_PATH, sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Invitation S & R — Mariage de Shekina & Ruth",
    description:
      `Vous êtes invité(e) au mariage de Shekina & Ruth, prévu le ${WEDDING_DATE_LABEL.toLowerCase()}. Consultez votre invitation personnelle.`,
    url: "/",
    siteName: "S & R — Mariage",
    type: "website",
    images: [{ url: WEDDING_SOCIAL_IMAGE_PATH, width: 1200, height: 630, alt: "Mariage de Shekina & Ruth" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Invitation S & R — Mariage de Shekina & Ruth",
    description:
      `Vous êtes invité(e) au mariage de Shekina & Ruth, prévu le ${WEDDING_DATE_LABEL.toLowerCase()}.`,
    images: [WEDDING_SOCIAL_IMAGE_PATH],
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
