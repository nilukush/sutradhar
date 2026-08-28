/**
 * Regenerates public/og-default.png (1200×630) — the branded Open Graph /
 * Twitter card used sitewide. Run: pnpm og:generate. The PNG is committed so
 * CI never needs sharp; this script exists for future redesigns.
 *
 * Design tokens from src/styles/global.css ("The Loom": warm paper, ink,
 * saffron thread). System fonts only — the card must render identically on
 * any machine that regenerates it.
 */
import sharp from "sharp";

const W = 1200;
const H = 630;
const PAPER = "#faf6ee";
const INK = "#1c1917";
const INK_SOFT = "#57534e";
const INK_FAINT = "#a8a29e";
const SAFFRON = "#e8590c";
const SAFFRON_DEEP = "#c2410c";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <rect x="0" y="0" width="${W}" height="8" fill="${SAFFRON}"/>

  <text x="84" y="150" font-family="Kohinoor Devanagari, Devanagari MT, serif" font-size="44" fill="${SAFFRON_DEEP}">सूत्रधर</text>
  <text x="84" y="330" font-family="Georgia, 'Times New Roman', serif" font-size="150" font-weight="bold" fill="${INK}">Sutradhar</text>

  <!-- the thread: a stitched saffron line -->
  <line x1="88" y1="392" x2="640" y2="392" stroke="${SAFFRON}" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 20"/>

  <text x="84" y="466" font-family="Georgia, 'Times New Roman', serif" font-size="42" fill="${INK_SOFT}">Every engineering story from India,</text>
  <text x="84" y="524" font-family="Georgia, 'Times New Roman', serif" font-size="42" fill="${INK_SOFT}">woven into one thread.</text>

  <text x="84" y="580" font-family="Menlo, Consolas, monospace" font-size="26" fill="${INK_FAINT}">sutradhar.nilukush.workers.dev</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile("public/og-default.png");
console.log("✓ public/og-default.png regenerated");
