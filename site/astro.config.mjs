// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare(),
  // The dev toolbar floats over the hero form and gets in the way of reviewing it.
  devToolbar: { enabled: false },
});
