import { randomBytes, randomInt } from "crypto";

/**
 * Generate a cryptographically-secure opaque public token (URL-safe).
 * Used in /i/[token] links and embedded in QR codes.
 */
export function generatePublicToken(length = 10): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

// Characters allowed in the random part — no ambiguous chars (no O/0, I/1, S/5)
const SAFE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ2346789";

function safeRandomString(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SAFE_ALPHABET[bytes[i] % SAFE_ALPHABET.length];
  }
  return out;
}

/**
 * Generate a human-readable backup code.
 * Format: PREFIX-TABLETAG-RANDOM (e.g. BAN-T1-X7K9)
 * - prefix: short, derived from the contact last name (sanitized)
 * - tableTag: derived from assigned table name, or "NA" if unassigned
 * - random: 4 cryptographically-secure chars
 * The random part guarantees unpredictability — the name/table alone never define uniqueness.
 */
export function generateBackupCode(lastName?: string, tableName?: string): string {
  const sanitize = (s: string) =>
    s
      .toUpperCase()
      .normalize("NFD")
      .replace(/[^A-Z]/g, "")
      .slice(0, 3)
      .padEnd(3, "X");

  const prefix = lastName ? sanitize(lastName) : safeRandomString(3);
  const tableTag = tableName
    ? sanitize(tableName).slice(0, 3).padEnd(3, "X")
    : "NA";
  const random = safeRandomString(4);
  return `${prefix}-${tableTag}-${random}`;
}

/**
 * Generate a short 6-character QR code linked to a person or couple.
 * This code is embedded directly in the QR code (NOT the URL) and is used
 * by the scanner to identify the invitation. It is:
 * - exactly 6 characters long
 * - cryptographically secure (randomBytes)
 * - uses only unambiguous characters (no O/0, I/1, S/5)
 * - unique per invitation
 */
export function generateQrCode(): string {
  return safeRandomString(6);
}

/**
 * Normalize a backup code for case-insensitive, tolerant comparison.
 * Removes spaces and extra dashes, uppercases.
 */
export function normalizeCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Generate a random table name tag (used when auto-creating tables). */
export function generateTableTag(): string {
  return safeRandomString(2);
}

/** Pick a random index — cryptographically secure. */
export function secureRandomInt(max: number): number {
  return randomInt(0, max);
}
