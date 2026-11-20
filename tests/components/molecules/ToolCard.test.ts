// @vitest-environment node
// Astro compiles .astro files for the browser under happy-dom, where they
// refuse to render; the Container needs the server build.

import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { Window } from "happy-dom"
import { expect, test } from "vitest"

import ToolCard from "#components/molecules/ToolCard.astro"

test("links to the tool with its name and tagline", async () => {
	const container = await AstroContainer.create()
	const html = await container.renderToString(ToolCard, {
		props: { slug: "combi-name", name: "Combi name codes", tagline: "Pack a run.", icon: "🍪" },
	})
	const doc = new new Window().DOMParser().parseFromString(html, "text/html")
	const link = doc.querySelector("a")
	expect(link?.getAttribute("href")).toBe("/combi-name/")
	expect(link?.textContent).toContain("Combi name codes")
	expect(link?.textContent).toContain("Pack a run.")
	expect(link?.querySelector(".icon")?.textContent).toBe("🍪")
})
