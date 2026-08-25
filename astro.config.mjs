// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  /**
   * The canonical origin, and the only place it is written.
   *
   * Layout.astro builds every canonical and OG URL from `Astro.site`, and
   * src/pages/sitemap.xml.ts throws without it rather than emitting the relative
   * URLs the sitemap protocol forbids. public/robots.txt is static and cannot
   * read this, so it repeats the origin and outputs/sitemap.test.ts pins the two
   * together — they had already drifted to two different domains once.
   *
   * No trailing slash: Astro strips it, but the test asserts the raw value so
   * nobody has to remember that.
   */
  site: 'https://thelongweekends.com',

  /**
   * Emit `about.html`, not `about/index.html`.
   *
   * Layout.astro builds its canonicals from the `path` it is handed ("/about")
   * and sitemap.xml.ts lists the same strings, so the two agreed with each
   * other — and neither agreed with the server. Astro's default `directory`
   * format writes `about/index.html`, which every static host serves at
   * `/about/`, so all six sitemap entries pointed at a URL that answered with a
   * 301 to the real one. The sitemap's own comment warns about exactly this.
   *
   * `file` format plus `trailingSlash: 'never'` makes the emitted path, the
   * canonical tag and the sitemap entry the same string. The homepage is
   * unaffected: it stays `index.html` served at `/`, which is why
   * outputs/sitemap.test.ts asserts the `/` entry separately.
   */
  trailingSlash: 'never',
  build: {
    format: 'file',
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
