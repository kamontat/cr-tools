import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { Window } from "happy-dom"
import { beforeAll, expect, test } from "vitest"

import { en } from "#lib/i18n/en"
import { th } from "#lib/i18n/th"
import { TOOLS } from "#lib/tools"

const root = `${import.meta.dirname}/../..`

beforeAll(() => {
	const build = spawnSync("pnpm", ["run", "build"], { cwd: root, encoding: "utf8" })
	if (build.status !== 0) throw new Error(build.stderr)
}, 120_000)

test("icons ship as files and the index does not", () => {
	expect(existsSync(`${root}/dist/assets/cookies/fire_spirit_cookie.webp`)).toBe(true)
	expect(readFileSync(`${root}/dist/.assetsignore`, "utf8")).toContain("assets/index.json")
})

test("pages build as folders, so /combi-name/ and its hash links still open", () => {
	expect(existsSync(`${root}/dist/combi-name/index.html`)).toBe(true)
	expect(existsSync(`${root}/dist/combi-name.html`)).toBe(false)
	expect(existsSync(`${root}/dist/settings/index.html`)).toBe(true)
	expect(existsSync(`${root}/dist/settings.html`)).toBe(false)
})

test("Home starts Thai and carries English too", () => {
	const html = readFileSync(`${root}/dist/index.html`, "utf8")
	expect(html).toContain('<html lang="th"')
	expect(html).toContain("เครื่องมือ Cookie Run")
	expect(html).toContain("Cookie Run tools")
})

test("Home has its title in the top bar, the intro, and one card per tool", () => {
	const html = readFileSync(`${root}/dist/index.html`, "utf8")
	const doc = new new Window().DOMParser().parseFromString(html, "text/html")
	expect(doc.querySelector('header h1 [data-lang="th"]')?.textContent).toBe(th.site.name)
	expect(doc.querySelector('header h1 [data-lang="en"]')?.textContent).toBe(en.site.name)
	expect(doc.querySelector('main#content > .wrap > p.intro:first-child [data-lang="th"]')?.textContent).toBe(
		th.site.intro,
	)
	expect(doc.querySelector('main p.intro [data-lang="en"]')?.textContent).toBe(en.site.intro)
	const hrefs = [...doc.querySelectorAll("main a.tool-card")].map((a) => a.getAttribute("href"))
	expect(hrefs).toEqual(TOOLS.map(({ slug }) => `/${slug}/`))
})

// One gutter for every page: the frame wraps the page in main > .wrap, so no
// page pads itself and Home, the tools and Settings line up.
test.each([
	["index.html", "p.intro"],
	["combi-name/index.html", "astro-island"],
	["settings/index.html", "astro-island"],
])("%s renders inside the frame's one content wrapper", (page, content) => {
	const html = readFileSync(`${root}/dist/${page}`, "utf8")
	const doc = new new Window().DOMParser().parseFromString(html, "text/html")
	expect(doc.querySelectorAll("main#content > .wrap")).toHaveLength(1)
	expect(doc.querySelector(`main#content > .wrap > ${content}`)).not.toBeNull()
})

// The top bar names the page; a heading in the page would only repeat it.
test.each(["index.html", "combi-name/index.html", "settings/index.html"])("%s has one h1, the top bar's", (page) => {
	const html = readFileSync(`${root}/dist/${page}`, "utf8")
	const doc = new new Window().DOMParser().parseFromString(html, "text/html")
	expect(doc.querySelectorAll("h1")).toHaveLength(1)
	expect(doc.querySelector("header h1.title")).not.toBeNull()
	expect(doc.querySelector("main h1")).toBeNull()
})

test("the combi page mounts the CombiApp island in the wide wrapper, client-only", () => {
	const html = readFileSync(`${root}/dist/combi-name/index.html`, "utf8")
	const doc = new new Window().DOMParser().parseFromString(html, "text/html")
	const island = doc.querySelector("main#content > .wrap[data-wide] > astro-island")
	expect(island).not.toBeNull()
	expect(island?.getAttribute("component-url")).toMatch(/CombiApp/)
	expect(island?.getAttribute("client")).toBe("only")
})

test("Home mounts the HomeSaved island between the intro and the tool cards, client-only", () => {
	const html = readFileSync(`${root}/dist/index.html`, "utf8")
	const doc = new new Window().DOMParser().parseFromString(html, "text/html")
	const island = doc.querySelector("main#content > .wrap > p.intro ~ astro-island")
	expect(island).not.toBeNull()
	expect(island?.getAttribute("component-url")).toMatch(/HomeSaved/)
	expect(island?.getAttribute("client")).toBe("only")
	expect(island?.nextElementSibling?.classList.contains("tools")).toBe(true)
})
