import QRCode from "qrcode";
import path from "path";
import fs from "fs/promises";

/**
 * Generate a QR code as a PNG buffer pointing to the public invitation URL.
 * The QR contains ONLY the opaque URL — never personal data.
 */
export async function generateQrCodeBuffer(publicUrl: string): Promise<Buffer> {
  return QRCode.toBuffer(publicUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 600,
    color: {
      dark: "#3A3527",
      light: "#FFFFFF",
    },
  });
}

/** Generate a base64 data URL for embedding in HTML/PDF. */
export async function generateQrCodeDataUrl(publicUrl: string): Promise<string> {
  return QRCode.toDataURL(publicUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 600,
    color: {
      dark: "#3A3527",
      light: "#FFFFFF",
    },
  });
}

const STORAGE_DIR = path.join(process.cwd(), "public", "storage");

export async function ensureStorageDirs() {
  await fs.mkdir(path.join(STORAGE_DIR, "qr"), { recursive: true });
  await fs.mkdir(path.join(STORAGE_DIR, "pdf"), { recursive: true });
  await fs.mkdir(path.join(STORAGE_DIR, "img"), { recursive: true });
}

export async function saveQrCode(token: string, publicUrl: string): Promise<string> {
  await ensureStorageDirs();
  const buffer = await generateQrCodeBuffer(publicUrl);
  const rel = `/storage/qr/${token}.png`;
  await fs.writeFile(path.join(process.cwd(), "public", rel), buffer);
  return rel;
}
