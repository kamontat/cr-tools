import { existsSync, globSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "vitest"

import { pageEntrypoints, TOOLS, type Tool } from "#lib/tools"

// A path, not a URL: under happy-dom, new URL(…, import.meta.url) resolves to an
// http://localhost:3000/ URL, which node:fs rejects (ERR_INVALID_URL_SCHEME).
const root = join(import.meta.dirname, "..", "..")

test("tool slugs are unique", () => {
	const slugs = TOOLS.map((tool) => tool.slug)
	expect(new Set(slugs).size).toBe(slugs.length)
})

// The sidebar is generated from this registry, so a registered tool with no
// page on disk is a link to a page that was never written.
test("every page the registry names exists on disk", () => {
	const entrypoints = pageEntrypoints()
	expect(entrypoints).toContain("src/pages/index.astro")
	expect(entrypoints.length).toBe(TOOLS.length + 1)

	for (const path of entrypoints) {
		expect(existsSync(join(root, path))).toBe(true)
	}
})

// The other direction: a page directory nobody registered is built and
// served, but no sidebar links to it. Settings is the one page that is part
// of the site rather than a tool.
test("every page directory is a registered tool or settings", () => {
	const found = globSync("*/index.astro", { cwd: join(root, "src", "pages") })

	expect(found.map((path) => path.split("/")[0]).sort()).toEqual([...TOOLS.map((tool) => tool.slug), "settings"].sort())
})

// The sidebar and the Home cards both show it, so it lives on the entry.
test("every tool has an icon", () => {
	for (const tool of TOOLS) expect(tool.icon.trim()).not.toBe("")
})

test("a tool without an icon does not typecheck", () => {
	// @ts-expect-error icon is required, so `astro check` fails on a tool registered without one
	const tool: Tool = { slug: "x", name: "X", tagline: "X" }
	expect(tool).toBeDefined()
})
