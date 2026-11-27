import { globSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"

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

/** The CSS of a source: a stylesheet whole, a component's `<style>` blocks only. */
const styles = (path: string, source: string): string =>
	path.endsWith(".css")
		? source
		: [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join("\n")

/** Every `property: value` declaration in some CSS, comments dropped. */
const declarations = (css: string): [property: string, value: string][] =>
	[...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(?:^|[;{\s])([a-z-]+)\s*:\s*([^;{}]+)(?=;|\})/g)].map(
		([, property = "", value = ""]) => [property, value.trim()],
	)

/** Declarations whose value holds a colour literal: hex, rgb() or hsl(). */
const colourLiterals = (css: string): string[] =>
	declarations(css)
		.filter(([property, value]) => !property.startsWith("--") && /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/i.test(value))
		.map(([property, value]) => `${property}: ${value}`)

/** `z-index` values that are a number instead of a `--z-*` token. */
const numericLayers = (css: string): string[] =>
	declarations(css)
		.filter(([property, value]) => property === "z-index" && !/^var\(--z-[\w-]+\)$/.test(value))
		.map(([property, value]) => `${property}: ${value}`)

/**
 * Radius and shadow values not built from tokens: each part must be a
 * `var(--…)`, a `calc()` of one, `0`, `none`, `inherit` or (a circle) `50%`.
 */
const looseShapes = (css: string): string[] =>
	declarations(css)
		.filter(([property]) => /^(?:border(?:-[a-z]+)*-radius|box-shadow)$/.test(property))
		.filter(([, value]) =>
			value
				.replace(/calc\([^()]*var\(--[\w-]+\)[^()]*\)/g, " ")
				.replace(/var\(--[\w-]+\)/g, " ")
				.split(/[\s,]+/)
				.filter(Boolean)
				.some((part) => !["0", "none", "inherit", "50%"].includes(part)),
		)
		.map(([property, value]) => `${property}: ${value}`)

/**
 * Sources that still break a check, from before the Sugar Rush look. Each
 * later piece of that work empties its part of these lists. A file that no
 * longer breaks a check must leave its list, so the lists only shrink.
 */
const allowed: Record<"colour" | "layer" | "shape", string[]> = {
	colour: ["src/components/organisms/Sidebar.astro"],
	layer: ["src/components/organisms/CombiEditor.svelte"],
	shape: [
		"src/components/atoms/EntryIcon.svelte",
		"src/components/molecules/CodeDisplay.svelte",
		"src/components/molecules/EntryPicker.svelte",
		"src/components/molecules/LoadoutIcons.svelte",
		"src/components/organisms/CombiApp.svelte",
		"src/components/organisms/CombiEditor.svelte",
		"src/components/organisms/CombiList.svelte",
		"src/components/organisms/EditorMainTab.svelte",
		"src/components/organisms/EditorTreasuresTab.svelte",
		"src/components/organisms/Sidebar.astro",
		"src/components/organisms/TopBar.astro",
		"src/components/organisms/TreasureSlot.svelte",
	],
}

const checks = { colour: colourLiterals, layer: numericLayers, shape: looseShapes } as const

describe.each(Object.keys(checks) as (keyof typeof checks)[])("the %s check", (name) => {
	test.each(sources.filter((path) => path !== "src/styles/tokens.css"))("%s", (path) => {
		const found = checks[name](styles(path, readFileSync(join(root, path), "utf8")))
		if (allowed[name].includes(path)) expect(found, "fixed: take it off the allow-list").not.toEqual([])
		else expect(found).toEqual([])
	})
})

test("the checks find what they should and pass what they should", () => {
	expect(colourLiterals("a { color: #fff; background: rgb(0 0 0 / 50%) }")).toHaveLength(2)
	expect(colourLiterals("a { color: var(--text); --x: #fff }")).toEqual([])
	expect(numericLayers("a { z-index: 5 } b { z-index: var(--z-sheet) }")).toEqual(["z-index: 5"])
	expect(looseShapes("a { border-radius: 8px; box-shadow: 0 1px 2px var(--ink) }")).toHaveLength(2)
	expect(
		looseShapes(
			"a { border-radius: var(--radius) var(--radius) 0 0; box-shadow: var(--shadow), var(--shadow-pop) } b { border-radius: 50%; box-shadow: none } c { border-radius: calc(var(--radius) - 3px) }",
		),
	).toEqual([])
	expect(styles("x.svelte", "<p style='color:#fff'></p><style>a { color: red }</style>")).toBe("a { color: red }")
})
