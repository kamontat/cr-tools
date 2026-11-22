// @vitest-environment node
// Astro compiles .astro files for the browser under happy-dom, where they
// refuse to render; the Container needs the server build.

import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { Window } from "happy-dom"
import { expect, test } from "vitest"

import NavItem from "#components/atoms/NavItem.astro"

const render = async (current?: boolean) => {
	const container = await AstroContainer.create()
	const html = await container.renderToString(NavItem, {
		props: { href: "/", icon: "⌂", label: { th: "หน้าแรก", en: "Home" }, current },
	})
	return new new Window().DOMParser().parseFromString(html, "text/html")
}

test("label and tooltip in both languages", async () => {
	const link = (await render()).querySelector("a")
	expect(link?.querySelector('.label [data-lang="th"]')?.textContent).toBe("หน้าแรก")
	expect(link?.querySelector('.label [data-lang="en"]')?.textContent).toBe("Home")
	expect(link?.getAttribute("title")).toBe("หน้าแรก")
	expect(link?.getAttribute("data-title-th")).toBe("หน้าแรก")
	expect(link?.getAttribute("data-title-en")).toBe("Home")
	expect(link?.hasAttribute("data-l10n")).toBe(true)
})

test("marks only the current page", async () => {
	expect((await render(true)).querySelector("a")?.getAttribute("aria-current")).toBe("page")
	expect((await render(false)).querySelector("a")?.hasAttribute("aria-current")).toBe(false)
})
