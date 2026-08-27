/**
 * Every country flag the picker can show, drawn rather than typed.
 *
 * WHY NOT EMOJI
 * -------------
 * The two-country version of this site used the flag emoji and had to stop.
 * A flag emoji is a pair of Regional Indicator letters the font is expected to
 * fuse into one glyph, and Segoe UI Emoji — the font Windows ships — has no
 * flag glyphs at all, so Chrome and Edge on Windows draw the letters instead.
 * The region menu rendered as bare "IN" and "US" tiles that looked like broken
 * images. Roughly half the audience for a work-holiday planner is on Windows,
 * so emoji was never a safe way to say this, and at forty-seven countries it
 * would have been forty-seven broken images rather than two.
 *
 * WHY A SPRITE
 * ------------
 * Each flag is a `<symbol>` defined once per page by FlagSprite.astro; every
 * `<Flag>` is a five-byte `<use>` pointing at it. The picker renders the full
 * list in the hero, again in the desktop navbar and again in the mobile one,
 * so inlining the artwork would put roughly a hundred and fifty copies of it
 * into the HTML of the homepage.
 *
 * HOW ACCURATE THESE ARE
 * ----------------------
 * They are drawn for 20x14 CSS pixels — about the size of a word — and
 * deliberately simplified to survive it. India's chakra is a ring, not
 * twenty-four spokes; the US canton carries no stars; Egypt's eagle and
 * Mexico's coat of arms are suggested rather than drawn. At this size the
 * detail would collapse into a smudge and cost legibility rather than buy
 * accuracy. Colours are the official ones throughout, because those are what
 * actually make a flag recognisable at a glance.
 *
 * Every entry is the INNER markup of a `viewBox="0 0 20 14"` SVG.
 */

/** Horizontal bands, top to bottom. `weights` default to equal thirds. */
function bands(colors: string[], weights?: number[]): string {
  const w = weights ?? colors.map(() => 1);
  const total = w.reduce((a, b) => a + b, 0);
  let y = 0;
  return colors
    .map((c, i) => {
      const h = (w[i] / total) * 14;
      const rect = `<rect y="${round(y)}" width="20" height="${round(h)}" fill="${c}"/>`;
      y += h;
      return rect;
    })
    .join("");
}

/** Vertical bands, hoist to fly. */
function vbands(colors: string[], weights?: number[]): string {
  const w = weights ?? colors.map(() => 1);
  const total = w.reduce((a, b) => a + b, 0);
  let x = 0;
  return colors
    .map((c, i) => {
      const width = (w[i] / total) * 20;
      const rect = `<rect x="${round(x)}" width="${round(width)}" height="14" fill="${c}"/>`;
      x += width;
      return rect;
    })
    .join("");
}

/**
 * The Nordic cross: offset toward the hoist, which is the whole point of it.
 * A centred cross reads as Switzerland instead.
 */
function nordic(bg: string, cross: string, inner?: string): string {
  const outer =
    `<rect width="20" height="14" fill="${bg}"/>` +
    `<rect y="5" width="20" height="4" fill="${cross}"/>` +
    `<rect x="5.5" width="3.4" height="14" fill="${cross}"/>`;
  if (!inner) return outer;
  return (
    outer +
    `<rect y="6" width="20" height="2" fill="${inner}"/>` +
    `<rect x="6.2" width="2" height="14" fill="${inner}"/>`
  );
}

/** A crescent, cut out of a disc by a second disc in the background colour. */
function crescent(cx: number, cy: number, r: number, fill: string, bg: string): string {
  return (
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>` +
    `<circle cx="${cx + r * 0.42}" cy="${cy}" r="${r * 0.82}" fill="${bg}"/>`
  );
}

/** A five-pointed star, as a polygon. */
function star(cx: number, cy: number, r: number, fill: string): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.382;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${round(cx + rad * Math.cos(a))},${round(cy + rad * Math.sin(a))}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="${fill}"/>`;
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * The Union Flag, written once and reused at half scale in the Australian and
 * New Zealand cantons. The diagonals are drawn without the offset that makes
 * the real saltire asymmetric — at this size the offset is a third of a pixel.
 */
const UNION =
  `<rect width="20" height="14" fill="#012169"/>` +
  `<path d="M0 0 20 14M20 0 0 14" stroke="#fff" stroke-width="3"/>` +
  `<path d="M0 0 20 14M20 0 0 14" stroke="#C8102E" stroke-width="1.5"/>` +
  `<path d="M10 0V14M0 7H20" stroke="#fff" stroke-width="4.6"/>` +
  `<path d="M10 0V14M0 7H20" stroke="#C8102E" stroke-width="2.6"/>`;

/** 13 bands, odd ones red. Height 14 / 13 = 1.0769. */
const US_STRIPE = 14 / 13;

export const FLAGS: Record<string, string> = {
  /* ---- Asia-Pacific ----------------------------------------------------- */
  IN:
    bands(["#ff9933", "#ffffff", "#138808"]) +
    `<circle cx="10" cy="7" r="1.7" fill="none" stroke="#0a3d91" stroke-width=".5"/>` +
    `<circle cx="10" cy="7" r=".4" fill="#0a3d91"/>`,

  CN:
    `<rect width="20" height="14" fill="#ee1c25"/>` +
    star(4.4, 4.2, 2.2, "#ffde00") +
    star(8.2, 1.9, .8, "#ffde00") +
    star(9.5, 3.6, .8, "#ffde00") +
    star(9.5, 5.8, .8, "#ffde00") +
    star(8.2, 7.4, .8, "#ffde00"),

  JP:
    `<rect width="20" height="14" fill="#ffffff"/>` +
    `<circle cx="10" cy="7" r="4.2" fill="#bc002d"/>`,

  KR:
    `<rect width="20" height="14" fill="#ffffff"/>` +
    `<path d="M6.5 7a3.5 3.5 0 0 1 7 0 1.75 1.75 0 0 0-3.5 0 1.75 1.75 0 0 1-3.5 0z" fill="#cd2e3a"/>` +
    `<path d="M6.5 7a3.5 3.5 0 0 0 7 0 1.75 1.75 0 0 1-3.5 0 1.75 1.75 0 0 0-3.5 0z" fill="#0047a0"/>` +
    `<g fill="#000"><rect x="2.2" y="3.1" width="2.6" height=".5"/>` +
    `<rect x="2.2" y="4.1" width="2.6" height=".5"/>` +
    `<rect x="15.2" y="9.4" width="2.6" height=".5"/>` +
    `<rect x="15.2" y="10.4" width="2.6" height=".5"/></g>`,

  TW:
    `<rect width="20" height="14" fill="#fe0000"/>` +
    `<rect width="10" height="7" fill="#000095"/>` +
    `<circle cx="5" cy="3.5" r="2.4" fill="#fff"/>` +
    `<circle cx="5" cy="3.5" r="1.5" fill="#000095"/>` +
    `<circle cx="5" cy="3.5" r="1.15" fill="#fff"/>`,

  HK:
    `<rect width="20" height="14" fill="#de2910"/>` +
    `<g fill="#fff">` +
    [0, 1, 2, 3, 4]
      .map((i) => {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        return `<ellipse cx="${round(10 + 2.1 * Math.cos(a))}" cy="${round(
          7 + 2.1 * Math.sin(a)
        )}" rx="1.15" ry=".72" transform="rotate(${round(
          (360 * i) / 5
        )} ${round(10 + 2.1 * Math.cos(a))} ${round(7 + 2.1 * Math.sin(a))})"/>`;
      })
      .join("") +
    `</g>`,

  SG:
    bands(["#ed2939", "#ffffff"]) +
    crescent(4.6, 3.6, 2.2, "#ffffff", "#ed2939") +
    star(8, 2.2, .7, "#ffffff") +
    star(9.4, 3.5, .7, "#ffffff") +
    star(8.9, 5.2, .7, "#ffffff") +
    star(7.1, 5.2, .7, "#ffffff") +
    star(6.6, 3.5, .7, "#ffffff"),

  MY:
    Array.from({ length: 14 }, (_, i) =>
      `<rect y="${round(i)}" width="20" height="1" fill="${i % 2 === 0 ? "#cc0001" : "#fff"}"/>`
    ).join("") +
    `<rect width="10" height="8" fill="#010066"/>` +
    crescent(4.2, 4, 2.1, "#ffcc00", "#010066") +
    star(7.4, 4, 1.5, "#ffcc00"),

  ID: bands(["#ce1126", "#ffffff"]),

  PH:
    bands(["#0038a8", "#ce1126"]) +
    `<path d="M0 0 10 7 0 14Z" fill="#fff"/>` +
    `<circle cx="2.6" cy="7" r="1.1" fill="#fcd116"/>`,

  VN: `<rect width="20" height="14" fill="#da251d"/>` + star(10, 7, 4, "#ffff00"),

  TH: bands(["#a51931", "#f4f5f8", "#2d2a4a", "#f4f5f8", "#a51931"], [1, 1, 2, 1, 1]),

  AU:
    `<rect width="20" height="14" fill="#012169"/>` +
    `<g transform="scale(.5)">${UNION}</g>` +
    star(5, 10.6, 1.5, "#fff") +
    star(15.4, 3.2, .9, "#fff") +
    star(13.6, 6.6, .9, "#fff") +
    star(16.6, 8.2, .9, "#fff") +
    star(15.1, 11, .9, "#fff"),

  NZ:
    `<rect width="20" height="14" fill="#012169"/>` +
    `<g transform="scale(.5)">${UNION}</g>` +
    star(16.6, 3.6, 1, "#C8102E") +
    star(14.4, 6.4, 1, "#C8102E") +
    star(17.2, 8, 1, "#C8102E") +
    star(15.2, 10.8, 1, "#C8102E"),

  /* ---- Europe ----------------------------------------------------------- */
  GB: UNION,
  IE: vbands(["#169b62", "#ffffff", "#ff883e"]),
  DE: bands(["#000000", "#dd0000", "#ffce00"]),
  FR: vbands(["#002654", "#ffffff", "#ce1126"]),
  NL: bands(["#ae1c28", "#ffffff", "#21468b"]),
  BE: vbands(["#000000", "#fdda24", "#ef3340"]),

  CH:
    `<rect width="20" height="14" fill="#d52b1e"/>` +
    `<rect x="8.8" y="3" width="2.4" height="8" fill="#fff"/>` +
    `<rect x="6" y="5.8" width="8" height="2.4" fill="#fff"/>`,

  AT: bands(["#ed2939", "#ffffff", "#ed2939"]),
  ES: bands(["#aa151b", "#f1bf00", "#aa151b"], [1, 2, 1]),

  PT:
    vbands(["#006600", "#ff0000"], [2, 3]) +
    `<circle cx="8" cy="7" r="2.4" fill="#ffe900" stroke="#ff0000" stroke-width=".3"/>` +
    `<circle cx="8" cy="7" r="1.3" fill="#fff"/>` +
    `<circle cx="8" cy="7" r=".7" fill="#003399"/>`,

  IT: vbands(["#008c45", "#f4f9ff", "#cd212a"]),
  PL: bands(["#ffffff", "#dc143c"]),

  CZ:
    bands(["#ffffff", "#d7141a"]) +
    `<path d="M0 0 8.2 7 0 14Z" fill="#11457e"/>`,

  RO: vbands(["#002b7f", "#fcd116", "#ce1126"]),
  UA: bands(["#0057b7", "#ffd700"]),
  EE: bands(["#0072ce", "#000000", "#ffffff"]),
  SE: nordic("#006aa7", "#fecc00"),
  NO: nordic("#ba0c2f", "#ffffff", "#00205b"),
  DK: nordic("#c8102e", "#ffffff"),
  FI: nordic("#ffffff", "#003580"),

  GR:
    Array.from({ length: 9 }, (_, i) =>
      `<rect y="${round((i * 14) / 9)}" width="20" height="${round(14 / 9)}" fill="${
        i % 2 === 0 ? "#0d5eaf" : "#fff"
      }"/>`
    ).join("") +
    `<rect width="7.8" height="7.8" fill="#0d5eaf"/>` +
    `<rect x="3.1" width="1.6" height="7.8" fill="#fff"/>` +
    `<rect y="3.1" width="7.8" height="1.6" fill="#fff"/>`,

  /* ---- Americas --------------------------------------------------------- */
  US:
    `<rect width="20" height="14" fill="#ffffff"/>` +
    [0, 2, 4, 6, 8, 10, 12]
      .map(
        (i) =>
          `<rect y="${round(i * US_STRIPE)}" width="20" height="${round(
            US_STRIPE
          )}" fill="#b22234"/>`
      )
      .join("") +
    `<rect width="8.4" height="${round(US_STRIPE * 7)}" fill="#3c3b6e"/>`,

  CA:
    vbands(["#ff0000", "#ffffff", "#ff0000"], [1, 2, 1]) +
    `<path d="M10 2.6 10.7 4.6 12.3 3.9 11.8 5.8 13.4 5.5 12.6 6.9 14 7.5 12.6 8.4 13 9.4 11.2 9.1 10.9 10 10.3 9.3 10.3 11.6 9.7 11.6 9.7 9.3 9.1 10 8.8 9.1 7 9.4 7.4 8.4 6 7.5 7.4 6.9 6.6 5.5 8.2 5.8 7.7 3.9 9.3 4.6Z" fill="#ff0000"/>`,

  MX:
    vbands(["#006847", "#ffffff", "#ce1126"]) +
    `<circle cx="10" cy="7" r="1.6" fill="none" stroke="#8c6d2f" stroke-width=".7"/>`,

  BR:
    `<rect width="20" height="14" fill="#009c3b"/>` +
    `<path d="M10 1.6 18.4 7 10 12.4 1.6 7Z" fill="#ffdf00"/>` +
    `<circle cx="10" cy="7" r="2.9" fill="#002776"/>` +
    `<path d="M7.2 6.1a3.2 3.2 0 0 1 5.7 1.3" fill="none" stroke="#fff" stroke-width=".7"/>`,

  AR:
    bands(["#74acdf", "#ffffff", "#74acdf"]) +
    `<circle cx="10" cy="7" r="1.5" fill="#f6b40e" stroke="#85340a" stroke-width=".22"/>`,

  /* ---- Middle East & Africa --------------------------------------------- */
  IL:
    `<rect width="20" height="14" fill="#ffffff"/>` +
    `<rect y="1.6" width="20" height="1.6" fill="#0038b8"/>` +
    `<rect y="10.8" width="20" height="1.6" fill="#0038b8"/>` +
    `<path d="M10 4.4 12.1 8.1 7.9 8.1Z" fill="none" stroke="#0038b8" stroke-width=".55"/>` +
    `<path d="M10 9.6 7.9 5.9 12.1 5.9Z" fill="none" stroke="#0038b8" stroke-width=".55"/>`,

  AE:
    bands(["#00732f", "#ffffff", "#000000"]) +
    `<rect width="5" height="14" fill="#ff0000"/>`,

  TR:
    `<rect width="20" height="14" fill="#e30a17"/>` +
    crescent(8, 7, 2.7, "#ffffff", "#e30a17") +
    star(12.4, 7, 1.3, "#ffffff"),

  EG:
    bands(["#ce1126", "#ffffff", "#000000"]) +
    `<circle cx="10" cy="7" r="1.35" fill="#c09300"/>`,

  ZA:
    `<rect width="20" height="14" fill="#ffffff"/>` +
    `<path d="M0 0h20v5.2H0z" fill="#de3831"/>` +
    `<path d="M0 8.8h20V14H0z" fill="#002395"/>` +
    `<path d="M0 1.1 8.4 7 0 12.9Z" fill="#ffb612"/>` +
    `<path d="M0 2.9 5.8 7 0 11.1Z" fill="#000"/>` +
    `<path d="M0 4.6 3.4 7 0 9.4Z" fill="#007a4d"/>` +
    `<path d="M4.6 4.6 20 4.6v1.2L4.9 5.8ZM4.6 9.4 20 9.4V8.2L4.9 8.2Z" fill="#007a4d"/>`,

  NG: vbands(["#008751", "#ffffff", "#008751"]),

  KE:
    bands(["#000000", "#ffffff", "#ce1126", "#ffffff", "#006600"], [4, 1, 4, 1, 4]) +
    `<ellipse cx="10" cy="7" rx="1.5" ry="3.1" fill="#b30000" stroke="#fff" stroke-width=".4"/>`,
};

/** A neutral tile for a country the sprite has no artwork for. */
export const FLAG_FALLBACK =
  `<rect width="20" height="14" rx="1.5" fill="currentColor" opacity=".12"/>` +
  `<rect x=".5" y=".5" width="19" height="13" rx="1.2" fill="none" stroke="currentColor" stroke-width="1" opacity=".35"/>`;

export const FLAG_CODES = Object.keys(FLAGS);
