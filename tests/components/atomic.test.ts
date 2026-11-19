import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { afterAll, describe, expect, it } from "vitest"

import { allowedImports, checkAtomic, tierOf } from "./atomic"

const root = join(import.meta.dirname, "..", "..")
const componentsDir = join(root, "src", "components")

describe("tierOf", () => {
	it("reads the tier from the first directory under src/components", () => {
		expect(tierOf("atoms/Heading.astro")).toBe("atoms")
		expect(tierOf("molecules/Card.astro")).toBe("molecules")
		expect(tierOf("organisms/Header.astro")).toBe("organisms")
	})

	it("returns undefined outside a tier", () => {
		expect(tierOf("Heading.astro")).toBeUndefined()
		expect(tierOf("widgets/Heading.astro")).toBeUndefined()
	})
})

describe("allowedImports", () => {
	it("lets atoms import no component", () => {
		expect(allowedImports.atoms).toEqual([])
	})

	it("lets molecules import only atoms", () => {
		expect(allowedImports.molecules).toEqual(["atoms"])
	})

	it("lets organisms import atoms, molecules and other organisms", () => {
		expect(allowedImports.organisms).toEqual(["atoms", "molecules", "organisms"])
	})
})

describe("checkAtomic", () => {
	const file = (path: string, imports: string[] = []) => ({ path, imports })

	it("accepts a component inside a tier with allowed imports", () => {
		expect(
			checkAtomic([
				file("atoms/Heading.astro"),
				file("molecules/Card.astro", ["atoms/Heading.astro"]),
				file("organisms/Header.astro", ["molecules/Card.astro", "atoms/Heading.astro"]),
			]),
		).toEqual([])
	})

	it("rejects a component outside a tier", () => {
		expect(checkAtomic([file("Heading.astro")])).toEqual([
			"Heading.astro is not inside atoms/, molecules/ or organisms/",
		])
	})

	it("rejects an upward import", () => {
		expect(checkAtomic([file("atoms/Heading.astro", ["molecules/Card.astro"])])).toEqual([
			"atoms/Heading.astro (atoms) must not import molecules/Card.astro (molecules)",
		])
	})

	it("rejects a molecule importing another molecule", () => {
		expect(checkAtomic([file("molecules/Card.astro", ["molecules/Tag.astro"])])).toEqual([
			"molecules/Card.astro (molecules) must not import molecules/Tag.astro (molecules)",
		])
	})

	it("treats .svelte components like .astro ones", () => {
		expect(checkAtomic([file("atoms/Seg.svelte"), file("molecules/Panel.svelte", ["atoms/Seg.svelte"])])).toEqual([])
		expect(checkAtomic([file("atoms/Seg.svelte", ["molecules/Panel.svelte"])])).toEqual([
			"atoms/Seg.svelte (atoms) must not import molecules/Panel.svelte (molecules)",
		])
	})
})

// The code a component's imports live in: the frontmatter of an .astro file,
// every <script> block of a .svelte file.
const importSource = (path: string, source: string) => {
	if (path.endsWith(".astro")) return source.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ""
	return [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]).join("\n")
}

// Lists every .astro and .svelte file under dir (src/components) with the
// component imports in its code, as paths relative to dir. A missing dir has
// no components.
const scan = (dir: string) => {
	if (!existsSync(dir)) return []
	const files = readdirSync(dir, { recursive: true, encoding: "utf8" }).filter(
		(path) => path.endsWith(".astro") || path.endsWith(".svelte"),
	)
	return files.map((path) => {
		const source = importSource(path, readFileSync(join(dir, path), "utf8"))
		const specifiers = [...source.matchAll(/from\s+["']([^"']+\.(?:astro|svelte))["']/g)].map(
			(match) => match[1] as string,
		)
		const imports = specifiers
			.map((specifier) => {
				if (specifier.startsWith("#components/")) return specifier.slice("#components/".length)
				if (specifier.startsWith(".")) {
					const target = resolve(dirname(join(dir, path)), specifier)
					const rel = relative(dir, target)
					return rel.startsWith("..") ? undefined : rel
				}
				return undefined
			})
			.filter((rel): rel is string => rel !== undefined)
			.map((rel) => rel.split(sep).join("/"))
		return { path: path.split(sep).join("/"), imports }
	})
}

describe("scan", () => {
	const fixture = mkdtempSync(join(import.meta.dirname, "fixture-"))
	afterAll(() => rmSync(fixture, { recursive: true, force: true }))

	const write = (path: string, source: string) => {
		mkdirSync(dirname(join(fixture, path)), { recursive: true })
		writeFileSync(join(fixture, path), source)
	}

	it("reads imports from .astro frontmatter and .svelte script blocks", () => {
		write("atoms/Seg.svelte", '<script lang="ts">\n\tlet { label } = $props()\n</script>\n\n<button>{label}</button>\n')
		write(
			"molecules/Panel.svelte",
			'<script lang="ts">\n\timport Seg from "../atoms/Seg.svelte"\n</script>\n\n<Seg label="a" />\n',
		)
		write(
			"organisms/Frame.astro",
			'---\nimport Panel from "#components/molecules/Panel.svelte"\n---\n\n<Panel client:only="svelte" />\n',
		)
		write("atoms/notes.md", 'import Panel from "../molecules/Panel.svelte"\n')

		expect(scan(fixture).sort((a, b) => a.path.localeCompare(b.path))).toEqual([
			{ path: "atoms/Seg.svelte", imports: [] },
			{ path: "molecules/Panel.svelte", imports: ["atoms/Seg.svelte"] },
			{ path: "organisms/Frame.astro", imports: ["molecules/Panel.svelte"] },
		])
	})

	it("finds nothing in a missing directory", () => {
		expect(scan(join(fixture, "missing"))).toEqual([])
	})
})

describe("src/components", () => {
	it("follows the atomic design tiers", () => {
		expect(checkAtomic(scan(componentsDir))).toEqual([])
	})
})
