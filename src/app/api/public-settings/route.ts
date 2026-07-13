import { NextResponse } from "next/server";
import { getPublicSettings, getDisplayNames } from "@/lib/settings";
import { formatWeddingDateLabel } from "@/lib/date-format";

export const runtime = "nodejs";

export async function GET() {
  const settings = await getPublicSettings();
  const names = getDisplayNames(settings);
  const dateLabel = formatWeddingDateLabel(settings.weddingDate);

  return NextResponse.json({
    groomFirstName: settings.groomFirstName,
    groomLastName: settings.groomLastName,
    brideFirstName: settings.brideFirstName,
    brideLastName: settings.brideLastName,
    monogram: settings.monogram,
    eventTitle: settings.eventTitle,
    weddingDate: settings.weddingDate,
    weddingDateLabel: dateLabel,
    contactEmail: settings.contactEmail,
    whatsappContact: settings.whatsappContact,
    publicBaseUrl: settings.publicBaseUrl,
    footerLine: `${settings.monogram} — Mariage de ${settings.groomFirstName} & ${settings.brideFirstName} · ${dateLabel}`,
    coupleShort: names.coupleShort,
    groomFull: names.groomFull,
    brideFull: names.brideFull,
  });
}
