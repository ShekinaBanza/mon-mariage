import fs from "fs/promises";
import fsSync from "fs";
import os from "os";
import path from "path";

interface FontEntry {
  family: string;
  weight: number;
  file: string;
  dataUrl?: string;
}

const FONT_FILES: FontEntry[] = [
  { family: "Playfair Display", weight: 600, file: "PlayfairDisplay-600.ttf" },
  { family: "Playfair Display", weight: 700, file: "PlayfairDisplay-700.ttf" },
  { family: "Cormorant Garamond", weight: 400, file: "CormorantGaramond-400.ttf" },
  { family: "Cormorant Garamond", weight: 500, file: "CormorantGaramond-500.ttf" },
  { family: "Jost", weight: 400, file: "Jost-400.ttf" },
  { family: "Jost", weight: 500, file: "Jost-500.ttf" },
];

let cachedCss: string | null = null;
let fontRuntimeReady = false;

function existingDir(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (fsSync.existsSync(candidate)) return candidate;
  }
  return null;
}

function getPublicDir(): string {
  return (
    existingDir([
      path.join(process.cwd(), "public"),
      path.join(process.cwd(), ".next", "standalone", "public"),
      path.resolve(process.cwd(), "..", "public"),
      path.resolve(process.cwd(), "..", "..", "public"),
    ]) ?? path.join(process.cwd(), "public")
  );
}

function getFontsDir(): string {
  return path.join(getPublicDir(), "fonts");
}

function getWritableRuntimeDir(): string | null {
  const candidates = [
    path.join(process.cwd(), ".fontconfig-runtime"),
    path.join(os.tmpdir(), "sr-wedding-fontconfig"),
  ];

  for (const dir of candidates) {
    try {
      fsSync.mkdirSync(path.join(dir, "cache"), { recursive: true });
      return dir;
    } catch {
      continue;
    }
  }

  return null;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function resolveFontPath(file: string): string | null {
  const candidate = path.join(getFontsDir(), file);
  return fsSync.existsSync(candidate) ? candidate : null;
}

export function setupFontRendering(): void {
  if (fontRuntimeReady) return;
  fontRuntimeReady = true;

  const fontsDir = getFontsDir();
  if (!fsSync.existsSync(fontsDir)) return;

  const runtimeDir = getWritableRuntimeDir();
  if (!runtimeDir) return;

  const cacheDir = path.join(runtimeDir, "cache");
  const configPath = path.join(runtimeDir, "fonts.conf");
  const config = `<?xml version="1.0"?>
<fontconfig>
  <dir>${escapeXml(fontsDir)}</dir>
  <cachedir>${escapeXml(cacheDir)}</cachedir>
</fontconfig>
`;

  try {
    fsSync.writeFileSync(configPath, config, "utf8");
    process.env.FONTCONFIG_FILE = configPath;
    process.env.XDG_CACHE_HOME = runtimeDir;
  } catch {
    // If fontconfig cannot be configured, SVG-embedded fonts still provide a fallback.
  }
}

export async function getEmbeddedFontCss(): Promise<string> {
  if (cachedCss) return cachedCss;

  let css = "";
  for (const f of FONT_FILES) {
    if (!f.dataUrl) {
      try {
        const fontPath = resolveFontPath(f.file);
        if (!fontPath) continue;
        const buf = await fs.readFile(fontPath);
        f.dataUrl = `data:font/ttf;base64,${buf.toString("base64")}`;
      } catch {
        // Font file missing: skip silently, renderer will fall back.
        continue;
      }
    }

    css += `@font-face {
      font-family: '${f.family}';
      font-weight: ${f.weight};
      font-style: normal;
      src: url("${f.dataUrl}") format('truetype');
    }\n`;
  }

  cachedCss = css;
  return css;
}
