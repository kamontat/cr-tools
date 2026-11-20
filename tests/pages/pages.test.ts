import { globSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { expect, test } from "vitest"

const pages = globSync("**/*.astro", { cwd: "src/pages" })
const layouts = globSync("*.astro", { cwd: "src/layouts" }).map((file) => file.replace(/\.astro$/, ""))

// Layouts a source file imports through #layouts/* and renders as a tag.
const usedLayouts = (source: string) =>
	[...source.matchAll(/^import (\w+) from "#layouts\/(\w+)\.astro";?$/gm)]
		.filter(([, local]) => new RegExp(`<${local}\\b`).test(source))
		.map(([, , layout]) => layout as string)

// True when the layout is the target or renders one that reaches it.
const reaches = async (target: string, layout: string, seen = new Set<string>()): Promise<boolean> => {
	if (layout === target) return true
	if (seen.has(layout)) return false
	seen.add(layout)
	const source = await readFile(`src/layouts/${layout}.astro`, "utf8")
	for (const inner of usedLayouts(source)) {
		if (await reaches(target, inner, seen)) return true
	}
	return false
}

const reachesBase = (layout: string) => reaches("BaseLayout", layout)

test("src/pages has at least one page", () => {
	expect(pages.length).toBeGreaterThan(0)
})

test.each(pages)("%s renders inside BaseLayout, which loads Google Tag Manager", async (page) => {
	const source = await readFile(`src/pages/${page}`, "utf8")
	const used = usedLayouts(source)
	expect(used.length).toBeGreaterThan(0)
	for (const layout of used) expect(await reachesBase(layout)).toBe(true)
})

// BaseLayout alone would build and pass the test above, with no top bar,
// sidebar or page gutter.
test.each(pages)("%s renders inside AppLayout, the frame", async (page) => {
	const source = await readFile(`src/pages/${page}`, "utf8")
	const used = usedLayouts(source)
	expect(used.length).toBeGreaterThan(0)
	for (const layout of used) expect(await reaches("AppLayout", layout)).toBe(true)
})

test.each(layouts)("layout %s wraps BaseLayout", async (layout) => {
	expect(await reachesBase(layout)).toBe(true)
})
