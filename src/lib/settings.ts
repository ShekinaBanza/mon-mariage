import { db } from "@/lib/db";
import { cache } from "react";
import {
  PUBLIC_BASE_URL,
  WEDDING_CONTACT_EMAIL,
  WEDDING_DATE_ISO,
  WEDDING_GIFT_MESSAGE,
  WEDDING_INVITATION_TEXT,
  WEDDING_LOGO_PATH,
  WEDDING_MAPS_LINK,
  WEDDING_SOCIAL_IMAGE_PATH,
  WEDDING_WHATSAPP_CONTACT,
} from "@/lib/wedding-config";

const DEFAULT_SETTINGS = {
  weddingDate: new Date(WEDDING_DATE_ISO),
  mapsLink: WEDDING_MAPS_LINK,
  invitationText: WEDDING_INVITATION_TEXT,
  giftMessage: WEDDING_GIFT_MESSAGE,
  logoUrl: WEDDING_LOGO_PATH,
  socialImageUrl: WEDDING_SOCIAL_IMAGE_PATH,
  whatsappContact: WEDDING_WHATSAPP_CONTACT,
  contactEmail: WEDDING_CONTACT_EMAIL,
  publicBaseUrl: PUBLIC_BASE_URL,
};

/**
 * Get the singleton wedding settings. Creates a default row if missing.
 * Cached per-request via React's cache().
 */
export const getSettings = cache(async () => {
  let settings = await db.weddingSettings.findUnique({ where: { id: "default" } });
  if (!settings) {
    settings = await db.weddingSettings.create({ data: { id: "default", ...DEFAULT_SETTINGS } });
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
  contactEmail: string | null;
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
    contactEmail: s.contactEmail,
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
