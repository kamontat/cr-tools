/// <reference types="vitest/config" />
import { svelteTesting } from "@testing-library/svelte/vite"
import { getViteConfig } from "astro/config"

// getViteConfig loads astro.config.ts, so the Svelte integration's Vite plugin
// compiles .svelte files here too; svelteTesting resolves Svelte's browser
// build for happy-dom and unmounts rendered components after each test.
export default getViteConfig({
	plugins: [svelteTesting()],
	test: {
		environmentOptions: {
			// Never fetch external scripts (such as gtm.js); report them as loaded instead of erroring.
			happyDOM: { settings: { handleDisabledFileLoadingAsSuccess: true } },
		},
		// Each project inherits the settings above; arrays such as include would
		// concatenate rather than replace, so only the projects name files.
		// Everything under tests/ runs: DOM-facing code in happy-dom, the rest
		// (scripts, config, pages) in plain Node.js.
		projects: [
			{
				extends: true,
				test: {
					name: "dom",
					include: ["tests/components/**/*.test.ts", "tests/lib/**/*.test.ts"],
					environment: "happy-dom",
				},
			},
			{
				extends: true,
				test: {
					name: "node",
					include: ["tests/**/*.test.ts"],
					exclude: ["tests/components/**", "tests/lib/**"],
				},
			},
		],
	},
})
