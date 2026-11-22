// @vitest-environment node
// Astro compiles .astro files for the browser under happy-dom, where they
// refuse to render; the Container needs the server build.

import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { Window } from "happy-dom"
import { expect, test } from "vitest"

import ToolCard from "#components/molecules/ToolCard.astro"
import { en } from "#lib/i18n/en"
import { th } from "#lib/i18n/th"

test("links to the tool with its name and tagline in both languages", async () => {
	const container = await AstroContainer.create()
	const html = await container.renderToString(ToolCard, { props: { slug: "combi-name", icon: "🍪" } })
	const doc = new new Window().DOMParser().parseFromString(html, "text/html")
	const link = doc.querySelector("a")
	expect(link?.getAttribute("href")).toBe("/combi-name/")
	expect(link?.querySelector('.name [data-lang="th"]')?.textContent).toBe(th.tools["combi-name"].name)
	expect(link?.querySelector('.name [data-lang="en"]')?.textContent).toBe(en.tools["combi-name"].name)
	expect(link?.querySelector('.tagline [data-lang="th"]')?.textContent).toBe(th.tools["combi-name"].tagline)
	expect(link?.querySelector('.tagline [data-lang="en"]')?.textContent).toBe(en.tools["combi-name"].tagline)
	expect(link?.querySelector(".icon")?.textContent).toBe("🍪")
})
