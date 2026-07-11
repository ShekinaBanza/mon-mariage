export const PUBLIC_BASE_URL = "https://lightslategrey-mandrill-130636.hostingersite.com";

export const WEDDING_DATE_ISO = "2026-08-29T00:00:00Z";
export const WEDDING_DATE_LABEL = "Samedi 29 août 2026";
export const WEDDING_DATE_LABEL_UPPER = "SAMEDI 29 AOÛT 2026";
export const WEDDING_START_ISO = "2026-08-29T11:00:00";
export const WEDDING_END_ISO = "2026-08-29T22:00:00";

export const WEDDING_GIFT_MESSAGE =
  "Si vous souhaitez également nous accompagner par un cadeau, nous privilégions les cadeaux en espèces.";

export const WEDDING_CONTACT_EMAIL = "ashekinabanza@hotmail.com";
export const WEDDING_WHATSAPP_CONTACT = "+243904274087";
export const WEDDING_MAPS_LINK = "https://maps.app.goo.gl/JGNykCvg1DgKL2pi9";

export const WEDDING_LOGO_PATH = "/logo-wedding.png";
export const WEDDING_FAVICON_PATH = "/favicon.png";
export const WEDDING_SOCIAL_IMAGE_PATH = "/logo-social.png?v=20260829";

export const WEDDING_INVITATION_TEXT =
  "Avec une immense joie et une profonde reconnaissance envers Dieu, nous souhaitons partager avec vous l'un des plus beaux moments de notre vie. Nous avons le plaisir de vous inviter à la célébration de notre mariage qui aura lieu le samedi 29 août 2026. Nous serions très heureux de vous compter parmi nous pour célébrer ce jour si spécial.";

export function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}
