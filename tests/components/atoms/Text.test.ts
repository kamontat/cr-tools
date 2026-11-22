// @vitest-environment node
// Astro compiles .astro files for the browser under happy-dom, where they
// refuse to render; the Container needs the server build.

import type { Messages } from "#lib/i18n/messages"

import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { Window } from "happy-dom"
import { expect, test } from "vitest"

import Text from "#components/atoms/Text.astro"

test("renders both languages, each marked", async () => {
	const container = await AstroContainer.create()
	const html = await container.renderToString(Text, { props: { pick: (m: Messages) => m.frame.home } })
	const doc = new new Window().DOMParser().parseFromString(html, "text/html")
	// No wrapper: the two spans are the whole output.
	expect(doc.body.children).toHaveLength(2)
	expect(doc.body.querySelectorAll("span")).toHaveLength(2)
	expect(doc.querySelector('[data-lang="th"]')?.textContent).toBe("หน้าแรก")
	expect(doc.querySelector('[data-lang="en"]')?.textContent).toBe("Home")
})
