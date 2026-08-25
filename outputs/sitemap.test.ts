/**
 * The sitemap, robots.txt, the canonical origin and the footer, pinned to each
 * other.
 *
 * astro.config.mjs, sitemap.xml.ts, robots.txt and Footer.astro have all named
 * this file as the thing that stops them drifting apart — "outputs/sitemap.test.ts
 * pins the two together, they had already drifted to two different domains
 * once", "fails the sweep if a sitemap entry has no link here". None of it was
 * true; the file did not exist. It does now.
 *
 * Four independent things can rot here, and each gets its own test:
 *   1. robots.txt is static and repeats the origin by necessity.
 *   2. A new page is easy to add and easy to forget in ENTRIES.
 *   3. A page in the sitemap with no inbound link is an orphan.
 *   4. A noindex page in the sitemap asks for the opposite of its own meta tag.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import astroConfig from "../astro.config.mjs";
import { ENTRIES } from "../src/pages/sitemap.xml";

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const ROBOTS = read("../public/robots.txt");
const FOOTER = read("../src/components/Footer.astro");

/** The origin, with no trailing slash — the raw form the config declares. */
const SITE = String(astroConfig.site).replace(/\/$/, "");

/** Pages that carry `noindex` and are deliberately absent from the sitemap. */
const NOINDEX_ROUTES = ["/404", "/500"];

describe("the canonical origin has exactly one definition", () => {
  it("astro.config.mjs declares a site with no trailing slash", () => {
    expect(astroConfig.site).toBeTruthy();
    expect(astroConfig.site).toBe("https://thelongweekends.com");
  });

  it("robots.txt repeats that origin and nothing else", () => {
    const sitemapLine = ROBOTS.match(/^Sitemap:\s*(\S+)$/m);
    expect(sitemapLine, "robots.txt has no Sitemap: line").not.toBeNull();
    expect(sitemapLine![1]).toBe(`${SITE}/sitemap.xml`);

    // Any other absolute URL in the file is a second copy of the origin waiting
    // to drift; the header comment names one, so both must match.
    const origins = [...ROBOTS.matchAll(/https?:\/\/[^\s/]+/g)].map((m) => m[0]);
    for (const origin of origins) {
      expect(origin).toBe(SITE);
    }
  });
});

describe("every indexable route is in the sitemap", () => {
  /** Route paths derived from the filesystem, the way Astro derives them. */
  const routes = readdirSync(fileURLToPath(new URL("../src/pages", import.meta.url)))
    .filter((f) => f.endsWith(".astro"))
    .map((f) => (f === "index.astro" ? "/" : `/${f.replace(/\.astro$/, "")}`));

  const sitemapPaths = ENTRIES.map((e) => e.path);

  it("finds every page under src/pages", () => {
    // A guard on the guard: if this ever reads zero files the sweep below
    // passes vacuously.
    expect(routes.length).toBeGreaterThanOrEqual(8);
  });

  it.each(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    readdirSync(fileURLToPath(new URL("../src/pages", import.meta.url)))
      .filter((f) => f.endsWith(".astro"))
      .map((f) => (f === "index.astro" ? "/" : `/${f.replace(/\.astro$/, "")}`))
      .filter((r) => !NOINDEX_ROUTES.includes(r))
  )("%s is listed", (route) => {
    expect(sitemapPaths).toContain(route);
  });

  it("lists nothing that is not a real route", () => {
    for (const path of sitemapPaths) {
      expect(routes).toContain(path);
    }
  });

  it("omits the noindex pages, which ask not to be indexed", () => {
    for (const route of NOINDEX_ROUTES) {
      expect(sitemapPaths).not.toContain(route);
    }
  });

  it("has no duplicate entries", () => {
    expect(new Set(sitemapPaths).size).toBe(sitemapPaths.length);
  });
});

describe("sitemap entries agree with the URLs the build serves", () => {
  /**
   * The defect this exists for: Astro's default `directory` format writes
   * `about/index.html`, served at `/about/`, while the sitemap and the
   * canonical tag both said `/about`. Every entry pointed at a 301.
   */
  it("the build emits file paths, not directories", () => {
    expect(astroConfig.build?.format).toBe("file");
    expect(astroConfig.trailingSlash).toBe("never");
  });

  it("no entry but the homepage carries a trailing slash", () => {
    for (const { path } of ENTRIES) {
      if (path === "/") continue;
      expect(path.endsWith("/")).toBe(false);
      expect(path.startsWith("/")).toBe(true);
    }
  });

  it("the homepage is listed as / and is the highest priority", () => {
    const home = ENTRIES.find((e) => e.path === "/");
    expect(home).toBeDefined();
    expect(home!.priority).toBe("1.0");
  });

  it("every lastmod is a real ISO date, not a build timestamp", () => {
    for (const { path, lastmod } of ENTRIES) {
      expect(lastmod, `${path} lastmod`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(lastmod))).toBe(false);
    }
  });
});

describe("no sitemap entry is an orphan", () => {
  /**
   * A page we ask Google to index and link to from nowhere is a page we have
   * given it no reason to trust. The footer is the only place the document
   * pages are linked from, which is why Footer.astro's comment says that file
   * and this one have to be edited together.
   */
  it.each(ENTRIES.map((e) => e.path).filter((p) => p !== "/"))(
    "%s is linked from the footer",
    (path) => {
      expect(FOOTER).toContain(`"${path}"`);
    }
  );

  /** The filter links are built from a frontmatter array and rendered with
   *  `href={l.href}`, so the literal attribute never appears in the source. */
  it("the homepage is reachable from the footer's filter links", () => {
    expect(FOOTER).toContain('href: "/?leaves=0"');
  });

  it("the footer links no noindex page", () => {
    for (const route of NOINDEX_ROUTES) {
      expect(FOOTER).not.toContain(`"${route}"`);
    }
  });
});
