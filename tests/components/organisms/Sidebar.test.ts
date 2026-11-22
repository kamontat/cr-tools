// @vitest-environment node
// Astro compiles .astro files for the browser under happy-dom, where they
// refuse to render; the Container needs the server build.

import type { FramePage } from "#lib/frame"
import type { Lang } from "#lib/lang"

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { Window } from "happy-dom"
import { expect, test } from "vitest"

import Sidebar from "#components/organisms/Sidebar.astro"
import { en } from "#lib/i18n/en"
import { th } from "#lib/i18n/th"
import { TOOLS } from "#lib/tools"

const render = async (current: FramePage) => {
	const container = await AstroContainer.create()
	const html = await container.renderToString(Sidebar, { props: { current } })
	return new new Window().DOMParser().parseFromString(html, "text/html")
}

test("links Home, each tool and Settings, in that order", async () => {
	const doc = await render("home")
	const links = [...doc.querySelectorAll("#sidebar a")]
	expect(links).toHaveLength(3)
	expect(links.map((link) => link.getAttribute("href"))).toEqual([
		"/",
		...TOOLS.map(({ slug }) => `/${slug}/`),
		"/settings/",
	])
	const label = (lang: Lang) => links.map((link) => link.querySelector(`.label [data-lang="${lang}"]`)?.textContent)
	expect(label("th")).toEqual([th.frame.home, ...TOOLS.map(({ slug }) => th.tools[slug].name), th.frame.settings])
	expect(label("en")).toEqual([en.frame.home, ...TOOLS.map(({ slug }) => en.tools[slug].name), en.frame.settings])
})

test("the navigation is named in both languages", async () => {
	const nav = (await render("home")).getElementById("sidebar")
	expect(nav?.getAttribute("aria-label")).toBe(th.frame.nav)
	expect(nav?.getAttribute("data-aria-label-en")).toBe(en.frame.nav)
	expect(nav?.hasAttribute("data-l10n")).toBe(true)
})

test.each<[FramePage, string]>([
	["home", "/"],
	["combi-name", "/combi-name/"],
	["settings", "/settings/"],
])("marks %s as the current page", async (current, href) => {
	const doc = await render(current)
	const marked = [...doc.querySelectorAll('#sidebar a[aria-current="page"]')]
	expect(marked.map((link) => link.getAttribute("href"))).toEqual([href])
})

test("is the labelled navigation landmark ☰ controls", async () => {
	const doc = await render("home")
	const nav = doc.getElementById("sidebar")
	expect(nav?.tagName).toBe("NAV")
	expect(nav?.getAttribute("aria-label")).toBeTruthy()
})

// Layout happy-dom cannot compute, pinned at the source.
const css = readFileSync(join(import.meta.dirname, "../../../src/components/organisms/Sidebar.astro"), "utf8")

test("the sidebar never aligns to the start of its grid row", () => {
	// Fixed over the page, a grid child keeps align-self, and start shrinks it
	// to its links instead of reaching the bottom of the screen.
	expect(css).not.toMatch(/align-self:\s*start/)
})

test("the sidebar does not animate while the window is resized", () => {
	expect(css).toMatch(/body\[data-resizing\]\)? nav[^{]*\{[^}]*transition:\s*none/)
})
