import { globSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "vitest"

const root = join(import.meta.dirname, "..", "..")

const sources = globSync("src/{components,layouts,pages,styles}/**/*.{astro,svelte,css}", { cwd: root })

/**
 * The selectors of every rule that sets `letter-spacing` but is not about a
 * code: the monospace codes may be spaced, nothing else may.
 */
const spacedOutsideCodes = (source: string): string[] =>
	[...source.matchAll(/letter-spacing\s*:/g)]
		.map((match) => {
			const open = source.lastIndexOf("{", match.index)
			const start = Math.max(
				source.lastIndexOf("}", open),
				source.lastIndexOf("{", open - 1),
				source.lastIndexOf(";", open),
			)
			return source.slice(start + 1, open).trim()
		})
		.filter((selector) => !/\bcode\b/.test(selector))

// The spec's Look: labels are sentence case, not spaced capitals, which also
// keeps Thai readable — letter-spacing pulls Thai combining marks off their base.
test.each(sources)("%s has no spaced capitals", (path) => {
	const source = readFileSync(join(root, path), "utf8")
	expect(source).not.toMatch(/text-transform:\s*(uppercase|capitalize)/)
	expect(spacedOutsideCodes(source)).toEqual([])
})

test("letter-spacing is allowed on code selectors only", () => {
	expect(spacedOutsideCodes("code { letter-spacing: 0.08em; }")).toEqual([])
	expect(spacedOutsideCodes(".row .code {\n\tletter-spacing: 1px;\n}")).toEqual([])
	expect(spacedOutsideCodes(".share-code, code.big { color: red; letter-spacing: 2px }")).toEqual([])
	expect(spacedOutsideCodes("@media (width > 1px) { .code { letter-spacing: 1px } }")).toEqual([])
	expect(spacedOutsideCodes(".label { letter-spacing: 1px }")).toEqual([".label"])
	expect(spacedOutsideCodes(".code { color: red }\n.title { letter-spacing: 1px }")).toEqual([".title"])
	expect(spacedOutsideCodes("h2 { letter-spacing: 0 }")).toEqual(["h2"])
})

test("the look check reads every component, layout, page and stylesheet", () => {
	expect(sources).toContain("src/components/organisms/SettingsApp.svelte")
	expect(sources).toContain("src/layouts/AppLayout.astro")
	expect(sources).toContain("src/styles/tokens.css")
})
