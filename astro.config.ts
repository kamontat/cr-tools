import svelte from "@astrojs/svelte"
import { defineConfig } from "astro/config"

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
	output: "static",
	// Links people already shared look like /combi-name/#CODE?note=…, so each page
	// builds as a folder (dist/combi-name/index.html) and the trailing slash keeps working.
	build: { format: "directory" },
	trailingSlash: "ignore",
	integrations: [svelte()],
})
