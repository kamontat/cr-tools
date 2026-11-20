import type { Messages } from "#lib/i18n/messages"

import { readFile } from "node:fs/promises"
import { runInNewContext } from "node:vm"
import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { Window } from "happy-dom"
import { expect, test } from "vitest"

import BaseLayout from "#layouts/BaseLayout.astro"

const renderBase = async () => {
	const container = await AstroContainer.create()
	return container.renderToString(BaseLayout, {
		props: { title: (m: Messages) => m.settings.title },
		slots: { default: "<p>Body</p>" },
	})
}

test("html starts Thai, carrying both titles", async () => {
	const html = await renderBase()
	const doc = new new Window().DOMParser().parseFromString(html, "text/html")
	const root = doc.documentElement
	expect(root.getAttribute("lang")).toBe("th")
	expect(root.getAttribute("data-title-th")).toBe("ตั้งค่า")
	expect(root.getAttribute("data-title-en")).toBe("Settings")
	expect(doc.querySelector("title")?.textContent).toBe("ตั้งค่า")
})

test("the language boot runs in head, before body", async () => {
	const html = await renderBase()
	const bodyAt = html.indexOf("<body")
	expect(bodyAt).toBeGreaterThan(0)
	const head = html.slice(0, bodyAt)
	const boot = [...head.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
		.map((match) => match[1] ?? "")
		.find((script) => script.includes("LANG_KEY"))
	expect(boot).toBeDefined()
	expect(boot).toContain('"lang"')
	expect(boot).toContain('"en"')
	expect(boot).toMatch(/try\s*\{[\s\S]*\}\s*catch/)
})

/**
 * Renders BaseLayout, loads it into a happy-dom document (which runs no script
 * itself) and runs the head's language boot, as the browser would before first
 * paint, against the given localStorage.
 */
const runLangBoot = async (localStorage: () => unknown) => {
	const html = await renderBase()
	const doc = new Window().document
	doc.write(html)
	const boot = [...doc.head.querySelectorAll("script")]
		.map((script) => script.textContent ?? "")
		.find((script) => script.includes("LANG_KEY"))
	expect(boot).toBeDefined()
	const context = { document: doc }
	Object.defineProperty(context, "localStorage", { get: localStorage })
	runInNewContext(boot ?? "", context)
	return doc
}

const storing = (lang: string) => () => ({ getItem: (key: string) => (key === "lang" ? lang : null) })

test("the language boot switches the page to English when English is stored", async () => {
	const doc = await runLangBoot(storing("en"))
	expect(doc.documentElement.getAttribute("lang")).toBe("en")
	expect(doc.title).toBe("Settings")
})

test("the language boot leaves the page Thai for any other stored value", async () => {
	const doc = await runLangBoot(storing("fr"))
	expect(doc.documentElement.getAttribute("lang")).toBe("th")
	expect(doc.title).toBe("ตั้งค่า")
})

test("the language boot leaves the page Thai, and throws nothing, when localStorage cannot be reached", async () => {
	const doc = await runLangBoot(() => {
		throw new Error("denied")
	})
	expect(doc.documentElement.getAttribute("lang")).toBe("th")
	expect(doc.title).toBe("ตั้งค่า")
})

test("BaseLayout passes LANG_KEY to the language boot rather than writing the key", async () => {
	const source = await readFile("src/layouts/BaseLayout.astro", "utf8")
	expect(source).toMatch(/import \{[^}]*\bLANG_KEY\b[^}]*\} from "#lib\/lang"/)
	expect(source).toMatch(/<script define:vars=\{\{\s*LANG_KEY\s*\}\}>/)
	// After the theme boot, before Google Tag Manager.
	const theme = source.indexOf('localStorage.getItem("theme")')
	const lang = source.indexOf("define:vars={{ LANG_KEY }}")
	const gtm = source.indexOf("loadGtm(")
	expect(theme).toBeGreaterThan(-1)
	expect(lang).toBeGreaterThan(theme)
	expect(gtm).toBeGreaterThan(lang)
})

test("BaseLayout loads Google Tag Manager from PUBLIC_GTM_ID", async () => {
	const source = await readFile("src/layouts/BaseLayout.astro", "utf8")
	expect(source).toMatch(/import \{ loadGtm \} from "#lib\/gtm";?$/m)
	expect(source).toMatch(/loadGtm\(import\.meta\.env\.PUBLIC_GTM_ID, document\);?$/m)
})

test("BaseLayout boots the saved theme from an inline script guarded by try", async () => {
	const source = await readFile("src/layouts/BaseLayout.astro", "utf8")
	const match = source.match(/<script is:inline>([\s\S]*?)<\/script>/)
	expect(match).not.toBeNull()
	expect(match?.[1]).toMatch(/try\s*\{[\s\S]*localStorage\.getItem\("theme"\)[\s\S]*\}\s*catch/)
})

test("BaseLayout puts the build environment on <html> as data-env", async () => {
	const source = await readFile("src/layouts/BaseLayout.astro", "utf8")
	expect(source).toContain("readBuildInfo().environment")
	expect(source).toMatch(/<html[^>]*data-env=\{/)
})

test("BaseLayout uses the Fairy Cookie icon as the one favicon", async () => {
	const source = await readFile("src/layouts/BaseLayout.astro", "utf8")
	expect(source).toContain('<link rel="icon" href="/assets/cookies/fairy_cookie.png">')
	expect(source).not.toMatch(/favicon\.(svg|ico)/)
})
