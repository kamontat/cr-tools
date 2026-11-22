import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { expect, test } from "vitest"

const root = join(import.meta.dirname, "..", "..")
const componentsDir = join(root, "src", "components")

function components(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name)
		if (entry.isDirectory()) return components(path)
		return /\.(svelte|astro)$/.test(entry.name) ? [path] : []
	})
}

/** Every opening tag of `name` in the components, whole, with the file it is in. */
function tags(name: string): { file: string; tag: string }[] {
	return components(componentsDir).flatMap((path) => {
		const source = readFileSync(path, "utf8")
		const file = relative(root, path)
		// A tag ends at the first `>` outside a `{…}` expression.
		const found: { file: string; tag: string }[] = []
		for (const match of source.matchAll(new RegExp(`<${name}\\b`, "g"))) {
			let depth = 0
			let end = match.index
			for (; end < source.length; end++) {
				const char = source[end]
				if (char === "{") depth++
				else if (char === "}") depth--
				else if (char === ">" && depth === 0) break
			}
			found.push({ file, tag: source.slice(match.index, end + 1) })
		}
		return found
	})
}

test("every form field has a name or an id, so the browser can fill and restore it", () => {
	const bare = ["input", "select", "textarea"]
		.flatMap(tags)
		.filter(({ tag }) => !/\s(name|id)=/.test(tag))
		.map(({ file, tag }) => `${file}: ${tag.split("\n")[0]}`)
	expect(bare).toEqual([])
})

// The attributes alone are not enough: the reset's `height: auto` overrides them,
// so each image also needs a size in CSS (EntryIcon sets it in its style).
test("every image gives its width and height", () => {
	const unsized = tags("img")
		.filter(({ tag }) => !/\swidth=/.test(tag) || !/\sheight=/.test(tag))
		.map(({ file, tag }) => `${file}: ${tag}`)
	expect(unsized).toEqual([])
})
