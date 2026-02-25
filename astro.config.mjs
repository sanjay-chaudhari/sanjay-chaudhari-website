// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://sanjaychaudhari.com',
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'one-dark-pro',
      wrap: false,
    },
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
