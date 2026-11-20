import svelte from "@astrojs/svelte"
import { defineConfig } from "astro/config"

// A build the deploy workflows did not stamp is a local build, and the About panel shows
// when it ran. `astro dev` is not a build, so it stays without a time.
if (process.argv.includes("build")) process.env["PUBLIC_BUILT_AT"] ??= new Date().toISOString()

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
	output: "static",
	// Links people already shared look like /combi-name/#CODE?note=…, so each page
	// builds as a folder (dist/combi-name/index.html) and the trailing slash keeps working.
	build: { format: "directory" },
	trailingSlash: "ignore",
	integrations: [svelte()],
})
