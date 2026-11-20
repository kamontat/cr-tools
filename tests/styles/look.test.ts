import { globSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "vitest"

const root = join(import.meta.dirname, "..", "..")

const sources = globSync("src/{components,layouts,pages,styles}/**/*.{astro,svelte,css}", { cwd: root })

// The spec's Look: labels are sentence case, not spaced capitals, which also
// keeps Thai readable — letter-spacing pulls Thai combining marks off their base.
test.each(sources)("%s has no spaced capitals", (path) => {
	const source = readFileSync(join(root, path), "utf8")
	expect(source).not.toMatch(/text-transform:\s*(uppercase|capitalize)/)
	expect(source).not.toMatch(/letter-spacing:/)
})

test("the look check reads every component, layout, page and stylesheet", () => {
	expect(sources).toContain("src/components/organisms/SettingsApp.svelte")
	expect(sources).toContain("src/layouts/AppLayout.astro")
	expect(sources).toContain("src/styles/tokens.css")
})
