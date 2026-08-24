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
  vite: {
    plugins: [tailwindcss()],
  },
});
