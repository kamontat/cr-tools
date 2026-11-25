// @vitest-environment node
// Astro compiles .astro files for the browser under happy-dom, where they
// refuse to render; the Container needs the server build.

import type { BuildEnv } from "#lib/build-info"
import type { Messages } from "#lib/i18n/messages"

import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { Window } from "happy-dom"
import { expect, test } from "vitest"

import TopBar from "#components/organisms/TopBar.astro"

const render = async (env: BuildEnv) => {
	const container = await AstroContainer.create()
	const html = await container.renderToString(TopBar, {
		props: { title: (m: Messages) => m.settings.title, env },
	})
	return new new Window().DOMParser().parseFromString(html, "text/html")
}

test("renders the ☰ toggle controlling the sidebar, collapsed", async () => {
	const doc = await render({ dev: false })
	const toggle = doc.getElementById("menu-toggle")
	expect(toggle?.tagName).toBe("BUTTON")
	expect(toggle?.getAttribute("type")).toBe("button")
	expect(toggle?.getAttribute("aria-controls")).toBe("sidebar")
	expect(toggle?.getAttribute("aria-expanded")).toBe("false")
	expect(toggle?.getAttribute("aria-label")).toBeTruthy()
})

test("the menu button is named in both languages", async () => {
	const toggle = (await render({ dev: false })).getElementById("menu-toggle")
	expect(toggle?.getAttribute("aria-label")).toBe("เมนู")
	expect(toggle?.getAttribute("data-aria-label-th")).toBe("เมนู")
	expect(toggle?.getAttribute("data-aria-label-en")).toBe("Menu")
	expect(toggle?.hasAttribute("data-l10n")).toBe(true)
})

test("renders the page title in both languages, as the page's one heading", async () => {
	const doc = await render({ dev: false })
	expect(doc.querySelector("h1.title")).not.toBeNull()
	expect(doc.querySelector('.title [data-lang="th"]')?.textContent).toBe("ตั้งค่า")
	expect(doc.querySelector('.title [data-lang="en"]')?.textContent).toBe("Settings")
})

test("shows the pr badge on a preview build", async () => {
	const doc = await render({ dev: false, deploy: "preview", pr: "31" })
	expect(doc.body.textContent).toContain("pr-31")
})

test.each<[string, BuildEnv]>([
	["production", { dev: false, deploy: "production", pr: "31" }],
	["local", { dev: false, pr: "31" }],
	["development", { dev: true, pr: "31" }],
])("shows no pr badge on a %s build", async (_, env) => {
	const doc = await render(env)
	expect(doc.body.textContent).not.toContain("pr-")
})
