// @ts-check
import { defineConfig } from 'astro/config';
import siteConfig from './site.config.ts';

// https://astro.build/config
export default defineConfig({
  site: `https://${siteConfig.githubUsername}.github.io`,
  base: '/portfolio',
  output: 'static',
});
