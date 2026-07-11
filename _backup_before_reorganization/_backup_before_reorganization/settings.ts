import { db } from "@/lib/db";
import { cache } from "react";

/**
 * Get the singleton wedding settings. Creates a default row if missing.
 * Cached per-request via React's cache().
 */
export const getSettings = cache(async () => {
  let settings = await db.weddingSettings.findUnique({ where: { id: "default" } });
  if (!settings) {
    settings = await db.weddingSettings.create({ data: { id: "default" } });
  }
  return settings;
});

export type WeddingSettingsData = Awaited<ReturnType<typeof getSettings>>;

export interface PublicSettings {
  groomFirstName: string;
  groomLastName: string;
  brideFirstName: string;
  brideLastName: string;
  monogram: string;
  eventTitle: string;
  weddingDate: string; // ISO
  ceremonyAddress: string;
  ceremonyTime: string;
  receptionAddress: string;
  receptionTime: string;
  mapsLink: string;
  invitationText: string;
  giftMessage: string;
  romanticPhrase: string;
  closingSignature: string;
  instructions: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  font: string;
  logoUrl: string | null;
  socialImageUrl: string | null;
  registrationOpen: boolean;
  registrationDeadline: string | null;
  validationMode: string;
  showSeatsOnInvitation: boolean;
  tableFormat: string;
  whatsappContact: string;
  publicBaseUrl: string;
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const s = await getSettings();
  return {
    groomFirstName: s.groomFirstName,
    groomLastName: s.groomLastName,
    brideFirstName: s.brideFirstName,
    brideLastName: s.brideLastName,
    monogram: s.monogram,
    eventTitle: s.eventTitle,
    weddingDate: s.weddingDate.toISOString(),
    ceremonyAddress: s.ceremonyAddress,
    ceremonyTime: s.ceremonyTime,
    receptionAddress: s.receptionAddress,
    receptionTime: s.receptionTime,
    mapsLink: s.mapsLink,
    invitationText: s.invitationText,
    giftMessage: s.giftMessage,
    romanticPhrase: s.romanticPhrase,
    closingSignature: s.closingSignature,
    instructions: s.instructions,
    primaryColor: s.primaryColor,
    secondaryColor: s.secondaryColor,
    accentColor: s.accentColor,
    font: s.font,
    logoUrl: s.logoUrl,
    socialImageUrl: s.socialImageUrl,
    registrationOpen: s.registrationOpen,
    registrationDeadline: s.registrationDeadline?.toISOString() ?? null,
    validationMode: s.validationMode,
    showSeatsOnInvitation: s.showSeatsOnInvitation,
    tableFormat: s.tableFormat,
    whatsappContact: s.whatsappContact,
    publicBaseUrl: s.publicBaseUrl,
  };
}

export function getDisplayNames(s: { groomFirstName: string; groomLastName: string; brideFirstName: string; brideLastName: string }) {
  return {
    groomFull: `${s.groomFirstName} ${s.groomLastName}`.trim(),
    brideFull: `${s.brideFirstName} ${s.brideLastName}`.trim(),
    coupleShort: `${s.groomFirstName} & ${s.brideFirstName}`,
  };
}
