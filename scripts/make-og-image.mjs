#!/usr/bin/env node
/**
 * Generates public/og-image.png — the card every chat app, Slack, WhatsApp,
 * LinkedIn and X draws when the site is pasted as a link.
 *
 * Run from the repo root with `node scripts/make-og-image.mjs`. It needs
 * nothing beyond the dependencies already installed (sharp ships with Astro's
 * image pipeline and rasterises the SVG below).
 *
 * Two things were wrong with the file this replaces, and they are the reason
 * this script exists rather than another hand-exported PNG:
 *
 * 1. It said "The Long Weekends 🇮🇳" — the emoji flag. Flag.astro already
 *    documents why that sequence is unusable here: it is a pair of Regional
 *    Indicator letters, Segoe UI Emoji ships no flag glyphs, and Windows
 *    therefore draws the letters. The old card had the emoji baked in as
 *    pixels, so it was worse than the live site's version of the same bug —
 *    whatever the exporting machine rendered is what every viewer got,
 *    forever. The flags below are drawn as vector geometry, lifted from
 *    Flag.astro so the card and the region menu cannot drift apart.
 *
 * 2. It named India only. The region control offers the US federal calendar
 *    too, and index.astro's own description says "India and the US" — so the
 *    single most-shared image on the site told half the audience the site was
 *    not for them. Both flags are on the card now, and the subtitle carries
 *    both years the solver actually covers.
 *
 * Text is typeset in Arial rather than the site's Plus Jakarta Sans: the
 * webfont is fetched from Google Fonts at runtime and is not installed here,
 * and librsvg silently substitutes a default when a family is missing. A
 * deliberate, present fallback beats an accidental one.
 */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

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
 * Flag geometry, copied from src/components/Flag.astro and drawn into a
 * 20x14 box that the caller scales and positions.
 *
 * Same deliberate simplifications as the component: the chakra is a ring
 * rather than 24 spokes and the US canton carries no stars. They are drawn
 * 46px wide here — larger than the menu's 20px, but a 50-star canton at this
 * size still resolves to noise once a chat client thumbnails the card.
 */
const STRIPE = 14 / 13;

function flagIN() {
  return `
    <rect width="20" height="14" fill="#ff9933"/>
    <rect y="4.667" width="20" height="4.666" fill="#ffffff"/>
    <rect y="9.333" width="20" height="4.667" fill="#138808"/>
    <circle cx="10" cy="7" r="1.7" fill="none" stroke="#0a3d91" stroke-width="0.5"/>
    <circle cx="10" cy="7" r="0.4" fill="#0a3d91"/>`;
}

function flagUS() {
  const stripes = Array.from({ length: 13 }, (_, i) => i)
    .filter((i) => i % 2 === 0)
    .map(
      (i) =>
        `<rect y="${(i * STRIPE).toFixed(4)}" width="20" height="${STRIPE.toFixed(
          4,
        )}" fill="#b22234"/>`,
    )
    .join("");
  return `
    <rect width="20" height="14" fill="#ffffff"/>
    ${stripes}
    <rect width="8.4" height="${(STRIPE * 7).toFixed(4)}" fill="#3c3b6e"/>`;
}

/**
 * One region chip: rounded well, flag, label.
 *
 * `width` is passed in rather than measured. librsvg gives no text metrics, so
 * the alternative is a font-metrics table for one string each — the widths
 * below were set by rendering and looking at the result, which is the same
 * information for none of the machinery.
 */
function chip({ x, y, width, flag, label }) {
  const h = 62;
  const fw = 46; // flag width; height follows the 20:14 ratio
  const fh = (fw * 14) / 20;
  const fx = x + 22;
  const fy = y + (h - fh) / 2;
  const scale = fw / 20;

  return `
    <rect x="${x}" y="${y}" width="${width}" height="${h}" rx="${h / 2}"
          fill="#ffffff" fill-opacity="0.06"
          stroke="#ffffff" stroke-opacity="0.14" stroke-width="1.5"/>
    <g transform="translate(${fx} ${fy}) scale(${scale})">
      ${flag}
      <rect width="20" height="14" fill="none" stroke="#000000" stroke-opacity="0.25" stroke-width="0.4"/>
    </g>
    <text x="${fx + fw + 16}" y="${y + h / 2}" dominant-baseline="central"
          font-family="${FONT}" font-size="27" font-weight="700" fill="${INK}"
          >${label}</text>`;
}

/* Chip row: widths tuned to the rendered Arial Bold strings, then the pair is
   centred as a unit so the row stays balanced if either label changes. */
const CHIP_IN = 172;
const CHIP_US = 282;
const CHIP_GAP = 18;
const chipRowX = (W - (CHIP_IN + CHIP_US + CHIP_GAP)) / 2;
const chipRowY = 104;

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

  ${chip({ x: chipRowX, y: chipRowY, width: CHIP_IN, flag: flagIN(), label: "India" })}
  ${chip({
    x: chipRowX + CHIP_IN + CHIP_GAP,
    y: chipRowY,
    width: CHIP_US,
    flag: flagUS(),
    label: "United States",
  })}

  <text x="${W / 2}" y="308" text-anchor="middle"
        font-family="${FONT}" font-size="94" font-weight="700"
        letter-spacing="-2" fill="${INK}">The Long Weekends</text>

  <text x="${W / 2}" y="378" text-anchor="middle"
        font-family="${FONT}" font-size="35" font-weight="400" fill="${MUTED}"
        >Every long weekend in 2026 and 2027,</text>
  <text x="${W / 2}" y="428" text-anchor="middle"
        font-family="${FONT}" font-size="35" font-weight="400" fill="${MUTED}"
        >and the exact leaves to book for each one.</text>

  <!-- Hairline above the domain: gives the lower third an edge to sit on so
       the wordmark does not float in the glow. -->
  <rect x="${W / 2 - 130}" y="500" width="260" height="1.5"
        fill="#ffffff" fill-opacity="0.14"/>

  <text x="${W / 2}" y="558" text-anchor="middle"
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

console.log(`wrote ${out} (${W}x${H})`);
