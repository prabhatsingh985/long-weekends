/**
 * sitemap.xml, generated at build time with no dependencies.
 *
 * Why not @astrojs/sitemap: for six static routes the integration's value is
 * auto-discovery, and the cost is a dependency plus an install step — and it
 * emits `sitemap-index.xml` pointing at `sitemap-0.xml`, so the file everyone
 * expects at /sitemap.xml does not exist. Written by hand, the URL is the
 * conventional one and the route list is reviewable in one screen. The tradeoff
 * is that a new page has to be added below; sitemap.test.ts fails the build if
 * one is forgotten, which is the whole reason that test exists.
 *
 * Astro turns a non-HTML file in src/pages into an endpoint, so this becomes
 * /sitemap.xml. In the default static output it is prerendered.
 */
import type { APIRoute } from "astro";

interface Entry {
  /**
   * Path exactly as Layout.astro receives it in `path`.
   *
   * These must match the canonical tags character for character. The build
   * outputs directories, so /about is also reachable as /about/ — declaring one
   * form in the canonical and the other here would have the sitemap contradict
   * the page it points at, which is one of the few sitemap mistakes Search
   * Console actually complains about.
   */
  path: string;
  /**
   * The date this page's content last changed. Hardcoded on purpose.
   *
   * The tempting version is `new Date()`, which would stamp every page with the
   * build time. Google's guidance is explicit that lastmod must reflect real
   * content changes, and that a sitemap where every date moves on every deploy
   * gets its lastmod ignored altogether. So these are edited by hand when the
   * page is edited — the same discipline as the "Last updated" line the legal
   * pages render, and for the legal pages the two are deliberately the same date.
   */
  lastmod: string;
  /**
   * Retained for crawlers that still read them. Google ignores both changefreq
   * and priority entirely; Bing and others treat them as weak hints. They cost
   * two lines and are not worth arguing about.
   */
  changefreq: "daily" | "weekly" | "monthly" | "yearly";
  priority: string;
}

/**
 * Every indexable route on the site.
 *
 * The error pages are absent by design: they carry `noindex`, and a sitemap is a
 * list of pages you are asking to have indexed, so including them would ask for
 * the opposite of what their own meta tag says.
 */
export const ENTRIES: Entry[] = [
  // The calculator. Its content genuinely shifts as breaks pass, and it is the
  // page every search term in the FAQ is aimed at.
  { path: "/", lastmod: "2026-08-25", changefreq: "daily", priority: "1.0" },
  {
    path: "/company-optimizer",
    lastmod: "2026-08-25",
    changefreq: "weekly",
    priority: "0.9",
  },
  /**
   * The coverage page. High priority because it is the only crawlable statement
   * of what the site actually covers — the homepage's results are rendered on
   * the client, so to a crawler that page is a search form. `monthly` because
   * its numbers only move when a holiday list is regenerated.
   */
  { path: "/countries", lastmod: "2026-08-27", changefreq: "monthly", priority: "0.8" },
  { path: "/about", lastmod: "2026-08-24", changefreq: "yearly", priority: "0.5" },
  { path: "/contact", lastmod: "2026-08-24", changefreq: "yearly", priority: "0.4" },
  { path: "/privacy", lastmod: "2026-08-26", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", lastmod: "2026-08-24", changefreq: "yearly", priority: "0.3" },
];

/**
 * Escapes the five characters XML reserves.
 *
 * None of the paths above contain any of them today. It is here because the
 * moment a filtered URL like `/?region=ALL&leaves=1` is added to the list, a raw
 * `&` makes the document malformed and the entire sitemap is rejected rather
 * than the one bad entry being skipped.
 */
const xmlEscape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const GET: APIRoute = ({ site }) => {
  /**
   * `site` comes from astro.config.mjs and is the same value Layout.astro builds
   * its canonical tags from, so the two cannot disagree about the domain.
   *
   * Throwing beats falling back to a relative path: the sitemap protocol
   * requires absolute URLs, so a missing `site` would produce a document that is
   * well-formed, uploads cleanly, and is silently rejected by every search
   * engine. A failed build is much easier to notice.
   */
  if (!site) {
    throw new Error(
      "sitemap.xml needs `site` in astro.config.mjs — the sitemap protocol requires absolute URLs."
    );
  }

  const urls = ENTRIES.map((e) => {
    const loc = xmlEscape(new URL(e.path, site).href);
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: {
      // charset is spelled out because the sitemap declares UTF-8 in its XML
      // prolog, and a host defaulting the header to latin-1 would contradict it.
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
