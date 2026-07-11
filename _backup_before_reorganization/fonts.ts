import fs from "fs/promises";
import path from "path";

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");

interface FontEntry {
  family: string;
  weight: number;
  file: string;
  dataUrl?: string; // cached base64 data URL
}

/**
 * Minimal set of font files we embed — only the weights actually used in the
 * invitation SVG. Keeping this small is critical: each base64 font is ~150 KB
 * and sharp loads the whole SVG into memory when rasterizing. Loading all 10
 * variants caused OOM kills on the dev server.
 *
 * Used weights in buildInvitationSvg:
 *  - Playfair Display 600 (monogram, names, table, footer)
 *  - Cormorant Garamond 400 (couple names, addresses, invitation text)
 *  - Jost 400 (labels, codes)
 */
const FONT_FILES: FontEntry[] = [
  { family: "Playfair Display", weight: 600, file: "PlayfairDisplay-600.ttf" },
  { family: "Playfair Display", weight: 700, file: "PlayfairDisplay-700.ttf" },
  { family: "Cormorant Garamond", weight: 400, file: "CormorantGaramond-400.ttf" },
  { family: "Cormorant Garamond", weight: 500, file: "CormorantGaramond-500.ttf" },
  { family: "Jost", weight: 400, file: "Jost-400.ttf" },
  { family: "Jost", weight: 500, file: "Jost-500.ttf" },
];

let cachedCss: string | null = null;

/**
 * Load all font files as base64 data URLs and return an @font-face CSS block
 * to embed in SVG <defs>. This ensures the downloaded PDF/JPG uses exactly
 * the same fonts as the on-screen preview (Playfair Display, Cormorant
 * Garamond, Jost).
 *
 * The result is cached for the lifetime of the process to avoid re-reading
 * the font files on every render.
 */
export async function getEmbeddedFontCss(): Promise<string> {
  if (cachedCss) return cachedCss;
  let css = "";
  for (const f of FONT_FILES) {
    if (!f.dataUrl) {
      try {
        const buf = await fs.readFile(path.join(FONTS_DIR, f.file));
        f.dataUrl = `data:font/ttf;base64,${buf.toString("base64")}`;
      } catch {
        // Font file missing — skip silently (renderer will fall back)
        continue;
      }
    }
    css += `@font-face {
      font-family: '${f.family}';
      font-weight: ${f.weight};
      font-style: normal;
      src: url(${f.dataUrl}) format('truetype');
    }\n`;
  }
  cachedCss = css;
  return css;
}
