import { globSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"

// The Sugar Rush look (docs/superpowers/specs/2026-11-25-sugar-rush-look-design.md):
// its tokens, its type and its page background.

const root = join(import.meta.dirname, "..", "..")
const read = (path: string) => readFileSync(join(root, path), "utf8")
const tokens = read("src/styles/tokens.css")

/** The custom properties declared directly in the first block that opens with `opener`. */
const block = (opener: string): Record<string, string> => {
	const start = tokens.indexOf(opener)
	if (start < 0) return {}
	const open = tokens.indexOf("{", start + opener.length - 1)
	const close = tokens.indexOf("}", open)
	const body = tokens.slice(open + 1, close)
	return Object.fromEntries(
		[...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name = "", value = ""]) => [name, value.trim()]),
	)
}

const dark = block(":root {")
const lightBySystem = block(':root:not([data-theme="dark"]) {')
const lightByChoice = block(':root[data-theme="light"] {')

const palette: Record<string, [dark: string, light: string]> = {
	"--bg": ["#1c1620", "#faf6f8"],
	"--surface": ["#262029", "#fff"],
	"--surface-2": ["#201a23", "#f4ecf0"],
	"--hover": ["#2f2833", "#f8f1f4"],
	"--text": ["#f1e9f2", "#2e2433"],
	"--muted": ["#ab9eb0", "#75687b"],
	"--line": ["#372e3b", "#ecdfe5"],
	"--ink": ["#5d4f63", "#4b3d52"],
	"--accent": ["#e27a9a", "#c9466f"],
	"--accent-deep": ["#a8506d", "#8e2f4e"],
	"--on-accent": ["#1c1620", "#fff"],
	"--secondary": ["#6cc7b2", "#3f9f8a"],
	"--pick": ["#e6c66e", "#f2d27a"],
	"--on-pick": ["#1c1620", "#2e2433"],
	"--code": ["#c2b0ec", "#6a4bb0"],
	"--danger": ["#f07c86", "#c9424f"],
	"--on-danger": ["#1c1620", "#fff"],
	"--scrim": ["rgb(5 2 10 / 60%)", "rgb(46 36 51 / 35%)"],
}

describe("palette", () => {
	test.each(Object.entries(palette))("%s is dark by default and light by system or choice", (name, [d, l]) => {
		expect(dark[name]).toBe(d)
		expect(lightBySystem[name]).toBe(l)
		expect(lightByChoice[name]).toBe(l)
	})

	test("dark is the default colour scheme", () => {
		expect(tokens).toMatch(/:root \{[^}]*color-scheme: dark;/)
	})
})

const shape: Record<string, string> = {
	"--radius": "14px",
	"--radius-sm": "10px",
	"--radius-ctl": "999px",
	"--border": "1.5px",
	"--shadow": "2px 2px 0 var(--ink)",
	"--shadow-pop": "4px 4px 0 var(--ink)",
	"--shadow-btn": "2px 2px 0",
	"--shadow-pop-at": "4px 4px 0",
	"--pad": "12px",
	"--gap": "10px",
	"--stack": "8px",
	"--ctl": "32px",
	"--tap": "2.75rem",
}

test.each(Object.entries(shape))("shape token %s is %s, whatever the theme", (name, value) => {
	expect(dark[name]).toBe(value)
	expect(lightBySystem[name]).toBeUndefined()
	expect(lightByChoice[name]).toBeUndefined()
})

test("type tokens name a Thai-ready face first, with a system fallback", () => {
	expect(dark["--font-head"]).toMatch(/^"Mitr", "IBM Plex Sans Thai", .*sans-serif$/)
	expect(dark["--font-ui"]).toBe("var(--font-head)")
	expect(dark["--font-body"]).toMatch(/^"IBM Plex Sans Thai", .*sans-serif$/)
	expect(dark["--mono"]).toMatch(/^"JetBrains Mono", .*monospace$/)
})

test("--radius-lg is gone: its users moved to --radius", () => {
	const sources = globSync("src/**/*.{astro,svelte,css,ts}", { cwd: root })
	expect(sources.filter((path) => read(path).includes("--radius-lg"))).toEqual([])
})

test("the fonts are self-hosted, imported once by global.css", () => {
	const global = read("src/styles/global.css")
	for (const file of [
		"@fontsource/mitr/500.css",
		"@fontsource/mitr/600.css",
		"@fontsource/ibm-plex-sans-thai/400.css",
		"@fontsource/ibm-plex-sans-thai/600.css",
		"@fontsource/ibm-plex-sans-thai/700.css",
		"@fontsource/jetbrains-mono/500.css",
		"@fontsource/jetbrains-mono/700.css",
	]) {
		expect(global).toContain(`@import "${file}";`)
	}
	expect(global).not.toMatch(/fonts\.googleapis\.com/)
})

/** The declarations of the first top-level rule whose selector is exactly `selector`. */
const rule = (source: string, selector: string): string => {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	return new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? ""
}

test("the page reads in the body face over a dot grid", () => {
	const body = rule(tokens, "body")
	expect(body).toMatch(/font-family:\s*var\(--font-body\)/)
	expect(body).toMatch(
		/background:\s*radial-gradient\(var\(--line\) 1\.6px, transparent 1\.9px\) 0 0 \/ 22px 22px,\s*var\(--bg\)/,
	)
})

test("headings are set in the heading face", () => {
	const headings = rule(tokens, "h1,\nh2,\nh3,\nh4")
	expect(headings).toMatch(/font-family:\s*var\(--font-head\)/)
	expect(headings).toMatch(/font-weight:\s*600/)
})
