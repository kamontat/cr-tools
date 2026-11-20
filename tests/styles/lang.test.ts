import { readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "vitest"

const root = join(import.meta.dirname, "..", "..")

test("the language not chosen is display none", () => {
	const css = readFileSync(join(root, "src/styles/lang.css"), "utf8")
	expect(css).toContain(':root:not([lang="en"]) [data-lang="en"]')
	expect(css).toContain(':root[lang="en"] [data-lang="th"]')
	// !important: a component's own display rule on a span must not reveal the other language.
	// Biome's unsafe fix strips it, so lang.css carries a biome-ignore.
	expect(css).toMatch(/display:\s*none\s*!important/)
	expect(readFileSync(join(root, "src/styles/global.css"), "utf8")).toMatch(/@import "\.\/lang\.css";/)
})
