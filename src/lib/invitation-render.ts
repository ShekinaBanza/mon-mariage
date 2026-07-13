import { db } from "@/lib/db";
import sharp from "sharp";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import path from "path";
import fs from "fs/promises";
import { ensureStorageDirs } from "@/lib/qr";
import { generateQrCodeDataUrl } from "@/lib/qr";
import { getSettings } from "@/lib/settings";
import { getEmbeddedFontCss } from "@/lib/fonts";
import { formatWeddingDateLabel } from "@/lib/date-format";

const A4_LANDSCAPE_W = 1123; // px @ 96dpi
const A4_LANDSCAPE_H = 794;

interface InvitationRenderData {
  monogram: string;
  groomFull: string;
  brideFull: string;
  guestLabel: string; // "Monsieur Jean Dupont" or "Couple : A & B"
  tableName: string;
  seatCodes: string[];
  showSeats: boolean;
  code: string;       // backup code (e.g. BAN-T1-X7K9)
  qrCode: string;     // short 6-char code embedded in the QR
  qrDataUrl: string;
  publicUrl: string;
  weddingDateLabel: string;
  ceremonyAddress: string;
  ceremonyTime: string;
  receptionAddress: string;
  receptionTime: string;
  invitationText: string;
  giftMessage: string;
  closingSignature: string;
  romanticPhrase: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars) {
      lines.push(line.trim());
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

/** Decorative floral corner (simple leaf motif). */
function floralCorner(x: number, y: number, flipX = false, flipY = false, color = "#C9A961"): string {
  const sx = flipX ? -1 : 1;
  const sy = flipY ? -1 : 1;
  return `
  <g transform="translate(${x},${y}) scale(${sx},${sy})" opacity="0.7">
    <path d="M0,0 C 20,-10 35,-25 45,-45 C 35,-30 20,-18 0,-12 Z" fill="${color}" />
    <path d="M0,0 C 15,5 25,15 30,30 C 22,18 12,8 0,4 Z" fill="${color}" opacity="0.8" />
    <circle cx="40" cy="-40" r="3" fill="${color}" />
    <circle cx="25" cy="22" r="2.5" fill="${color}" opacity="0.7" />
    <path d="M5,-5 Q 18,-12 30,-22" stroke="${color}" stroke-width="0.6" fill="none" opacity="0.6" />
  </g>`;
}

/** Build the invitation as an SVG string. Async because it embeds font files. */
export async function buildInvitationSvg(data: InvitationRenderData): Promise<string> {
  const fontCss = await getEmbeddedFontCss();
  const W = A4_LANDSCAPE_W;
  const H = A4_LANDSCAPE_H;
  const textLines = wrapText(data.invitationText, 78);
  const giftLines = wrapText(data.giftMessage, 60);
  const sigLines = wrapText(data.closingSignature, 60);

  // Vertical layout positions
  let y = 70;
  const cx = W / 2;

  const monogramBlock = `
    <text x="${cx}" y="${y}" text-anchor="middle" font-family="Playfair Display, Georgia, serif" font-size="54" font-weight="600" fill="${data.secondaryColor}" letter-spacing="8">${escapeXml(data.monogram)}</text>
    <line x1="${cx - 90}" y1="${y + 18}" x2="${cx + 90}" y2="${y + 18}" stroke="${data.secondaryColor}" stroke-width="1.2"/>
  `;
  y += 60;

  const namesBlock = `
    <text x="${cx}" y="${y}" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-size="30" fill="#3A3527">${escapeXml(data.groomFull)}</text>
    <text x="${cx}" y="${y + 30}" text-anchor="middle" font-family="Playfair Display, serif" font-size="18" fill="${data.secondaryColor}" letter-spacing="6">&amp;</text>
    <text x="${cx}" y="${y + 58}" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-size="30" fill="#3A3527">${escapeXml(data.brideFull)}</text>
  `;
  y += 92;

  const subtitleBlock = `
    <text x="${cx}" y="${y}" text-anchor="middle" font-family="Jost, sans-serif" font-size="13" fill="#7A6F56" letter-spacing="4">${escapeXml("— INVITATION AU MARIAGE —")}</text>
  `;
  y += 30;

  // Left column: guest + table/seat + QR
  const leftX = 90;
  const rightX = W - 90;

  // Vertical divider between guest info and invitation text
  const divider = `
    <line x1="${W / 2}" y1="${y - 5}" x2="${W / 2}" y2="${H - 90}" stroke="${data.accentColor}" stroke-width="1" stroke-dasharray="2 5" opacity="0.7"/>
  `;

  // Guest section (left)
  const guestY = y + 10;
  const guestBlock = `
    <text x="${leftX}" y="${guestY}" font-family="Jost, sans-serif" font-size="11" fill="${data.secondaryColor}" letter-spacing="3">${escapeXml("CETTE INVITATION EST ADRESSÉE À")}</text>
    <text x="${leftX}" y="${guestY + 32}" font-family="Playfair Display, serif" font-size="26" fill="#3A3527" font-weight="600">${escapeXml(data.guestLabel)}</text>
  `;

  // Table & seats (left, below guest)
  const tableY = guestY + 75;
  let tableBlock = `
    <text x="${leftX}" y="${tableY}" font-family="Jost, sans-serif" font-size="11" fill="${data.secondaryColor}" letter-spacing="3">${escapeXml("VOTRE TABLE")}</text>
    <text x="${leftX}" y="${tableY + 30}" font-family="Playfair Display, serif" font-size="24" fill="${data.primaryColor}" font-weight="600">${escapeXml(data.tableName)}</text>
  `;
  if (data.showSeats && data.seatCodes.length > 0) {
    tableBlock += `
      <text x="${leftX}" y="${tableY + 58}" font-family="Jost, sans-serif" font-size="11" fill="#7A6F56" letter-spacing="2">${escapeXml("PLACES : " + data.seatCodes.join("  ·  "))}</text>
    `;
  }

  // QR + codes (left, bottom). The QR contains the short 6-char qrCode.
  // We display both the short QR code and the longer backup code.
  const qrY = tableY + 90;
  const qrBlock = `
    <image x="${leftX}" y="${qrY}" width="130" height="130" href="${data.qrDataUrl}" />
    <text x="${leftX + 65}" y="${qrY + 150}" text-anchor="middle" font-family="Jost, sans-serif" font-size="10" fill="${data.secondaryColor}" letter-spacing="2">${escapeXml("CODE QR")}</text>
    <text x="${leftX + 65}" y="${qrY + 168}" text-anchor="middle" font-family="Jost, sans-serif" font-size="15" fill="#3A3527" font-weight="700" letter-spacing="3">${escapeXml(data.qrCode)}</text>
    <text x="${leftX}" y="${qrY + 195}" font-family="Jost, sans-serif" font-size="9" fill="${data.secondaryColor}" letter-spacing="2">${escapeXml("CODE DE SECOURS")}</text>
    <text x="${leftX}" y="${qrY + 212}" font-family="Jost, sans-serif" font-size="13" fill="#3A3527" font-weight="600" letter-spacing="2">${escapeXml(data.code)}</text>
  `;

  // Right column: ceremony/reception + text
  const rightTextX = W / 2 + 40;
  const ceremonyY = y + 10;
  const ceremonyBlock = `
    <text x="${rightTextX}" y="${ceremonyY}" font-family="Jost, sans-serif" font-size="11" fill="${data.secondaryColor}" letter-spacing="3">${escapeXml("CÉRÉMONIE RELIGIEUSE")}</text>
    <text x="${rightTextX}" y="${ceremonyY + 26}" font-family="Cormorant Garamond, serif" font-size="18" fill="#3A3527">${escapeXml(data.ceremonyAddress)}</text>
    <text x="${rightTextX}" y="${ceremonyY + 46}" font-family="Jost, sans-serif" font-size="13" fill="#7A6F56">${escapeXml("Dès " + data.ceremonyTime)}</text>

    <text x="${rightTextX}" y="${ceremonyY + 82}" font-family="Jost, sans-serif" font-size="11" fill="${data.secondaryColor}" letter-spacing="3">${escapeXml("RÉCEPTION")}</text>
    <text x="${rightTextX}" y="${ceremonyY + 108}" font-family="Cormorant Garamond, serif" font-size="18" fill="#3A3527">${escapeXml(data.receptionAddress)}</text>
    <text x="${rightTextX}" y="${ceremonyY + 128}" font-family="Jost, sans-serif" font-size="13" fill="#7A6F56">${escapeXml("Dès " + data.receptionTime)}</text>
  `;

  // Invitation text block (right, lower)
  let textY = ceremonyY + 165;
  let textSvg = `<text x="${rightTextX}" y="${textY}" font-family="Jost, sans-serif" font-size="11" fill="${data.secondaryColor}" letter-spacing="3">${escapeXml("MOT DES MARIÉS")}</text>`;
  textY += 22;
  for (const ln of textLines.slice(0, 6)) {
    textSvg += `<text x="${rightTextX}" y="${textY}" font-family="Cormorant Garamond, serif" font-size="14" fill="#3A3527">${escapeXml(ln)}</text>`;
    textY += 19;
  }

  // Footer: date + signature
  const footerY = H - 78;
  const footerBlock = `
    <text x="${cx}" y="${footerY}" text-anchor="middle" font-family="Playfair Display, serif" font-size="16" fill="${data.primaryColor}" font-weight="600" letter-spacing="3">${escapeXml(data.weddingDateLabel)}</text>
    <text x="${cx}" y="${footerY + 22}" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="13" fill="#7A6F56" font-style="italic">${escapeXml(data.romanticPhrase)}</text>
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <style type="text/css"><![CDATA[
        ${fontCss}
      ]]></style>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FBF8F1"/>
        <stop offset="100%" stop-color="#F3EBD8"/>
      </linearGradient>
      <pattern id="paper" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
        <circle cx="30" cy="30" r="0.5" fill="${data.secondaryColor}" opacity="0.15"/>
      </pattern>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#paper)"/>
    <!-- double border -->
    <rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="${data.secondaryColor}" stroke-width="1.5" opacity="0.8"/>
    <rect x="32" y="32" width="${W - 64}" height="${H - 64}" fill="none" stroke="${data.secondaryColor}" stroke-width="0.6" opacity="0.5"/>

    ${floralCorner(50, 50, false, false, data.secondaryColor)}
    ${floralCorner(W - 50, 50, true, false, data.secondaryColor)}
    ${floralCorner(50, H - 50, false, true, data.secondaryColor)}
    ${floralCorner(W - 50, H - 50, true, true, data.secondaryColor)}

    ${monogramBlock}
    ${namesBlock}
    ${subtitleBlock}
    ${divider}
    ${guestBlock}
    ${tableBlock}
    ${qrBlock}
    ${ceremonyBlock}
    ${textSvg}
    ${footerBlock}
  </svg>`;
}

const STORAGE_DIR = path.join(process.cwd(), "public", "storage");

async function buildRenderData(invitationId: string): Promise<{ data: InvitationRenderData; invitation: any }> {
  const inv = await db.invitation.findUnique({
    where: { id: invitationId },
    include: {
      guest: true,
      members: true,
      table: true,
      assignments: { include: { seat: true } },
    },
  });
  if (!inv) throw new Error("Invitation introuvable.");

  const settings = await getSettings();
  const groomFull = `${settings.groomFirstName} ${settings.groomLastName}`.trim();
  const brideFull = `${settings.brideFirstName} ${settings.brideLastName}`.trim();

  // Build guest label
  let guestLabel = "";
  if (inv.type === "couple" && inv.members.length === 2) {
    const m1 = inv.members[0];
    const m2 = inv.members[1];
    guestLabel = `Couple : ${m1.firstName} ${m1.lastName} & ${m2.firstName} ${m2.lastName}`;
  } else {
    const m = inv.members[0];
    const title = m.sex === "female" ? "Madame/Mademoiselle" : "Monsieur";
    guestLabel = `${title} ${m.firstName} ${m.middleName ? m.middleName + " " : ""}${m.lastName}`;
  }

  const tableName = inv.table?.name ?? "Non attribuée";
  const seatCodes = inv.assignments.map((a: any) => a.seat.code).sort();

  // The QR code contains the short 6-char code linked to this person/couple
  // (NOT the URL). The scanner looks up invitations by this qrCode field.
  const qrDataUrl = await generateQrCodeDataUrl(inv.qrCode);
  const publicUrl = `${settings.publicBaseUrl || ""}/i/${inv.publicToken}`;

  const dateLabel = formatWeddingDateLabel(settings.weddingDate);

  return {
    invitation: inv,
    data: {
      monogram: settings.monogram,
      groomFull,
      brideFull,
      guestLabel,
      tableName,
      seatCodes,
      showSeats: settings.showSeatsOnInvitation,
      code: inv.code,
      qrCode: inv.qrCode,
      qrDataUrl,
      publicUrl,
      weddingDateLabel: dateLabel,
      ceremonyAddress: settings.ceremonyAddress,
      ceremonyTime: settings.ceremonyTime,
      receptionAddress: settings.receptionAddress,
      receptionTime: settings.receptionTime,
      invitationText: settings.invitationText,
      giftMessage: settings.giftMessage,
      closingSignature: settings.closingSignature,
      romanticPhrase: settings.romanticPhrase,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      accentColor: settings.accentColor,
    },
  };
}

/** Render the invitation to a high-resolution PNG buffer. */
export async function renderInvitationPng(invitationId: string, scale = 2): Promise<Buffer> {
  const { data } = await buildRenderData(invitationId);
  const svg = await buildInvitationSvg(data);
  return sharp(Buffer.from(svg), { density: 96 * scale })
    .png()
    .toBuffer();
}

/** Render the invitation as the canonical SVG used by the page preview and downloads. */
export async function renderInvitationSvg(invitationId: string): Promise<string> {
  const { data } = await buildRenderData(invitationId);
  return buildInvitationSvg(data);
}

/** Render the invitation to a JPG buffer. */
export async function renderInvitationJpg(invitationId: string, scale = 2): Promise<Buffer> {
  const { data } = await buildRenderData(invitationId);
  const svg = await buildInvitationSvg(data);
  return sharp(Buffer.from(svg), { density: 96 * scale })
    .jpeg({ quality: 92 })
    .toBuffer();
}

/** Render the invitation to a PDF buffer (A4 landscape). */
export async function renderInvitationPdf(invitationId: string): Promise<Buffer> {
  // Use scale=2 (2246×1588) instead of 3 to reduce memory pressure —
  // the PDF is A4 landscape which prints well at this resolution.
  const pngBuffer = await renderInvitationPng(invitationId, 2);
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle("Invitation S & R — Mariage Shekina & Ruth");
  pdfDoc.setAuthor("Shekina BANZA & Ruth KASONGO");
  pdfDoc.setSubject("Invitation au mariage");
  // A4 landscape in points: 841.89 × 595.28
  const page = pdfDoc.addPage([841.89, 595.28]);
  const pngImage = await pdfDoc.embedPng(pngBuffer);
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: page.getWidth(),
    height: page.getHeight(),
  });
  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

/** Persist generated files to disk and update the invitation record. */
export async function generateAndStoreInvitationFiles(invitationId: string): Promise<{ pdfPath: string; imagePath: string }> {
  await ensureStorageDirs();
  const { invitation } = await buildRenderData(invitationId);

  const pdfBuf = await renderInvitationPdf(invitationId);
  const imgBuf = await renderInvitationJpg(invitationId, 2);

  const pdfPath = `/storage/pdf/${invitation.publicToken}.pdf`;
  const imagePath = `/storage/img/${invitation.publicToken}.jpg`;

  await fs.writeFile(path.join(process.cwd(), "public", pdfPath), pdfBuf);
  await fs.writeFile(path.join(process.cwd(), "public", imagePath), imgBuf);

  await db.invitation.update({
    where: { id: invitationId },
    data: {
      pdfPath,
      imagePath,
      lastGeneratedAt: new Date(),
    },
  });

  return { pdfPath, imagePath };
}

/** Build the social share image (1200×630) — generic, no real QR (cached by WhatsApp). */
export async function renderSocialImage(): Promise<Buffer> {
  const settings = await getSettings();
  const weddingDateLabelUpper = formatWeddingDateLabel(settings.weddingDate, true);
  const W = 1200;
  const H = 630;
  const groom = `${settings.groomFirstName} ${settings.groomLastName}`.trim();
  const bride = `${settings.brideFirstName} ${settings.brideLastName}`.trim();
  // Decorative pseudo-QR (static grid pattern)
  let qrCells = "";
  const cell = 14;
  const offsetX = 880;
  const offsetY = 150;
  for (let r = 0; r < 22; r++) {
    for (let c = 0; c < 22; c++) {
      // Deterministic pseudo-random pattern
      const v = (r * 7 + c * 13 + (r * c) % 5) % 3;
      if (v !== 0) {
        qrCells += `<rect x="${offsetX + c * cell}" y="${offsetY + r * cell}" width="${cell}" height="${cell}" fill="#3A3527"/>`;
      }
    }
  }
  // Three position squares (like a QR)
  const finder = (x: number, y: number) => `
    <rect x="${x}" y="${y}" width="${cell * 7}" height="${cell * 7}" fill="#3A3527"/>
    <rect x="${x + cell}" y="${y + cell}" width="${cell * 5}" height="${cell * 5}" fill="white"/>
    <rect x="${x + cell * 2}" y="${y + cell * 2}" width="${cell * 3}" height="${cell * 3}" fill="#3A3527"/>
  `;
  const qrSvg = `
    <rect x="${offsetX - 10}" y="${offsetY - 10}" width="${cell * 22 + 20}" height="${cell * 22 + 20}" fill="white" rx="6"/>
    ${qrCells}
    ${finder(offsetX, offsetY)}
    ${finder(offsetX + cell * 15, offsetY)}
    ${finder(offsetX, offsetY + cell * 15)}
  `;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FBF8F1"/>
        <stop offset="60%" stop-color="#F3EBD8"/>
        <stop offset="100%" stop-color="#E8DFCB"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect x="30" y="30" width="${W - 60}" height="${H - 60}" fill="none" stroke="#C9A961" stroke-width="2"/>
    <rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="#C9A961" stroke-width="0.8"/>

    ${floralCorner(60, 60, false, false, "#C9A961")}
    ${floralCorner(W - 60, 60, true, false, "#C9A961")}
    ${floralCorner(60, H - 60, false, true, "#C9A961")}
    ${floralCorner(W - 60, H - 60, true, true, "#C9A961")}

    <text x="80" y="160" font-family="Playfair Display, Georgia, serif" font-size="64" font-weight="600" fill="#C9A961" letter-spacing="10">${escapeXml(settings.monogram)}</text>
    <line x1="80" y1="185" x2="240" y2="185" stroke="#C9A961" stroke-width="1.5"/>

    <text x="80" y="250" font-family="Jost, sans-serif" font-size="18" fill="#7A6F56" letter-spacing="5">VOUS ÊTES INVITÉ(E) AU MARIAGE DE</text>

    <text x="80" y="320" font-family="Cormorant Garamond, Georgia, serif" font-size="54" fill="#3A3527" font-weight="500">${escapeXml(settings.groomFirstName)} &amp; ${escapeXml(settings.brideFirstName)}</text>
    <text x="80" y="368" font-family="Jost, sans-serif" font-size="22" fill="#5E7A52" letter-spacing="3">${escapeXml(groom)}  &amp;  ${escapeXml(bride)}</text>

    <text x="80" y="440" font-family="Playfair Display, serif" font-size="30" fill="#5E7A52" font-weight="600" letter-spacing="4">${escapeXml(weddingDateLabelUpper)}</text>
    <text x="80" y="475" font-family="Cormorant Garamond, serif" font-size="20" fill="#7A6F56" font-style="italic">Cérémonie dès ${escapeXml(settings.ceremonyTime)} · Réception dès ${escapeXml(settings.receptionTime)}</text>

    <text x="80" y="560" font-family="Jost, sans-serif" font-size="14" fill="#C9A961" letter-spacing="4">INVITATION S &amp; R  ·  scannez votre QR code à l'entrée</text>

    <g transform="translate(0,0)">${qrSvg}</g>
  </svg>`;

  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

/** Build a QR code preview for display on the public invitation page. */
export async function getInvitationQrDataUrl(publicToken: string, baseUrl: string): Promise<string> {
  return generateQrCodeDataUrl(`${baseUrl}/i/${publicToken}`);
}
