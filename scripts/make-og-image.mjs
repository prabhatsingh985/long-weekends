#!/usr/bin/env node
/**
 * Generates public/og-image.png — the card every chat app, Slack, WhatsApp,
 * LinkedIn and X draws when the site is pasted as a link.
 *
 * Run from the repo root with `node scripts/make-og-image.mjs`. It needs
 * nothing beyond the dependencies already installed (sharp ships with Astro's
 * image pipeline and rasterises the SVG below).
 *
 * WHY THE FLAGS ARE VECTORS AND NOT EMOJI
 * The card this replaces said "The Long Weekends 🇮🇳". Flag.astro documents why
 * that sequence is unusable here: it is a pair of Regional Indicator letters,
 * Segoe UI Emoji ships no flag glyphs, and Windows therefore draws the letters.
 * Baked into a PNG it was worse than the live site's version of the same bug —
 * whatever the exporting machine rendered is what every viewer got, forever.
 *
 * WHY THE ARTWORK IS IMPORTED RATHER THAN COPIED
 * It used to be copied: this file carried its own flagIN() and flagUS(), lifted
 * from Flag.astro, with a comment promising the two would not drift. At two
 * flags that was a small bet. At forty-seven it is not a bet worth taking, so
 * the geometry is imported from src/data/flags.ts — the same module the site
 * renders — and the card cannot show a flag the picker does not.
 *
 * That import is why this needs a Node with TypeScript type-stripping (23.6 or
 * newer, or 22.x with --experimental-strip-types). The script is a manual,
 * occasional one and is not part of `npm run build` or the deploy, so the
 * requirement costs nothing at release time; it fails with a readable message
 * below rather than a module-resolution stack trace.
 *
 * Text is typeset in Arial rather than the site's Plus Jakarta Sans: the
 * webfont is fetched from Google Fonts at runtime and is not installed here,
 * and librsvg silently substitutes a default when a family is missing. A
 * deliberate, present fallback beats an accidental one.
 */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

let FLAGS, COUNTRY_COUNT;
try {
  ({ FLAGS } = await import("../src/data/flags.ts"));
  const data = await import("../holidays.json", { with: { type: "json" } });
  COUNTRY_COUNT = Object.keys(data.default.countries).length;
} catch (err) {
  console.error(
    "Could not load the flag artwork or the country data.\n" +
      "This script imports src/data/flags.ts directly, which needs Node 23.6+ " +
      "(or Node 22 run with --experimental-strip-types).\n" +
      `Node here is ${process.version}.\n\nUnderlying error: ${err.message}`
  );
  process.exit(1);
}

/** The size every consumer normalises to. Facebook, X and Slack all crop or
 *  letterbox anything else; 1200x630 is the 1.91:1 they agree on. */
const W = 1200;
const H = 630;

/* Straight from src/styles/global.css — dark theme, since that is the
   palette the card reads as regardless of the viewer's own setting. */
const BG = "#0b0b0e";
const INK = "#f4f4f6";
const MUTED = "#9a9aa4";
const BRAND = "#ff2b63";
const BRAND_TEXT = "#ff7ba1";

const FONT = "Arial, 'Segoe UI', Helvetica, sans-serif";

/**
 * The twelve flags on the card.
 *
 * Twelve, not forty-seven: at card size forty-seven tiles are a texture rather
 * than a set of flags, and the point of the row is that a reader recognises
 * their own. These are picked to span all four continent groups and to lead
 * with the largest software workforces, so most viewers find one they know in
 * the first glance. The real number is stated in the subtitle, where it can be
 * read rather than counted.
 */
const SHOWN = ["IN", "US", "GB", "DE", "FR", "PL", "BR", "CA", "JP", "CN", "SG", "AU"];

const missing = SHOWN.filter((c) => !FLAGS[c]);
if (missing.length) {
  console.error(`No artwork for ${missing.join(", ")} in src/data/flags.ts`);
  process.exit(1);
}

/**
 * One flag tile, scaled out of the shared 20x14 artwork.
 *
 * The hairline is drawn over the flag rather than around it because several of
 * these are white at an edge — Poland, Japan, Finland — and on this background
 * they would otherwise bleed into it and read as a gap in the row.
 */
function tile(code, x, y, width) {
  const height = (width * 14) / 20;
  const scale = width / 20;
  return `
    <g transform="translate(${x} ${y}) scale(${scale})">
      ${FLAGS[code]}
      <rect width="20" height="14" fill="none"
            stroke="#ffffff" stroke-opacity="0.35" stroke-width="0.5"/>
    </g>`;
}

/* The row, centred as a unit so it stays balanced if a flag is swapped. */
const TILE_W = 62;
const TILE_H = (TILE_W * 14) / 20;
const TILE_GAP = 16;
const rowWidth = SHOWN.length * TILE_W + (SHOWN.length - 1) * TILE_GAP;
const rowX = (W - rowWidth) / 2;
const rowY = 96;

const flagRow = SHOWN.map((code, i) =>
  tile(code, rowX + i * (TILE_W + TILE_GAP), rowY, TILE_W)
).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <!-- Brand glow, top-left, echoing the hero. The old card used a saffron
         wash for the same job; brand pink is what the site actually is. -->
    <radialGradient id="glowBrand" cx="0" cy="0" r="1"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="translate(120 40) rotate(40) scale(560)">
      <stop offset="0" stop-color="${BRAND}" stop-opacity="0.24"/>
      <stop offset="1" stop-color="${BRAND}" stop-opacity="0"/>
    </radialGradient>
    <!-- A cool counterweight bottom-right so the composition is not lit from
         one corner only. Deep indigo, the same hue as the US canton. -->
    <radialGradient id="glowCool" cx="0" cy="0" r="1"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="translate(1120 620) rotate(-140) scale(680)">
      <stop offset="0" stop-color="#3c3b6e" stop-opacity="0.62"/>
      <stop offset="1" stop-color="#3c3b6e" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect width="${W}" height="${H}" fill="url(#glowCool)"/>
  <rect width="${W}" height="${H}" fill="url(#glowBrand)"/>

  ${flagRow}

  <text x="${W / 2}" y="${rowY + TILE_H + 46}" text-anchor="middle"
        font-family="${FONT}" font-size="26" font-weight="700"
        letter-spacing="2.5" fill="${MUTED}"
        >AND ${COUNTRY_COUNT - SHOWN.length} MORE</text>

  <text x="${W / 2}" y="352" text-anchor="middle"
        font-family="${FONT}" font-size="94" font-weight="700"
        letter-spacing="-2" fill="${INK}">The Long Weekends</text>

  <text x="${W / 2}" y="422" text-anchor="middle"
        font-family="${FONT}" font-size="35" font-weight="400" fill="${MUTED}"
        >Public holidays in ${COUNTRY_COUNT} countries, 2026 and 2027 —</text>
  <text x="${W / 2}" y="472" text-anchor="middle"
        font-family="${FONT}" font-size="35" font-weight="400" fill="${MUTED}"
        >and the exact leaves to book for each break.</text>

  <!-- Hairline above the domain: gives the lower third an edge to sit on so
       the wordmark does not float in the glow. -->
  <rect x="${W / 2 - 130}" y="524" width="260" height="1.5"
        fill="#ffffff" fill-opacity="0.14"/>

  <text x="${W / 2}" y="580" text-anchor="middle"
        font-family="${FONT}" font-size="30" font-weight="700"
        letter-spacing="0.5" fill="${BRAND_TEXT}">thelongweekends.com</text>
</svg>`;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "public/og-image.png");

await sharp(Buffer.from(svg))
  /* No alpha: several clients composite the card onto white, and a
     transparent PNG would put light-grey text on white there. */
  .flatten({ background: BG })
  .png({ compressionLevel: 9 })
  .toFile(out);

console.log(`wrote ${out} (${W}x${H}) — ${SHOWN.length} flags, ${COUNTRY_COUNT} countries`);
