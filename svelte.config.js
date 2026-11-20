import { vitePreprocess } from "@astrojs/svelte"

// Read by @astrojs/svelte in astro build and by its Vite plugin under Vitest.
export default {
	preprocess: vitePreprocess(),
}
