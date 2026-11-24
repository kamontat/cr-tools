import type { Messages } from "#lib/i18n/messages"

import { readFile } from "node:fs/promises"
import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { Window } from "happy-dom"
import { expect, test } from "vitest"

import AppLayout from "#layouts/AppLayout.astro"

test("AppLayout's pre-paint boot script takes the key and breakpoint from #lib/frame", async () => {
	const source = await readFile("src/layouts/AppLayout.astro", "utf8")
	expect(source).toMatch(/import \{[^}]*\bFULL_MIN_WIDTH\b[^}]*\bSIDEBAR_KEY\b[^}]*\} from "#lib\/frame"/)
	const boot = source.match(/<script define:vars=\{\{([^}]*)\}\}>([\s\S]*?)<\/script>/)
	expect(boot).not.toBeNull()
	expect(boot?.[1]).toContain("SIDEBAR_KEY")
	expect(boot?.[1]).toContain("FULL_MIN_WIDTH")
	expect(boot?.[2]).not.toContain("frame:sidebar")
	expect(boot?.[2]).not.toMatch(/\b1100\b/)
})

test("AppLayout gives every page one padded, width-capped wrapper", async () => {
	const source = await readFile("src/layouts/AppLayout.astro", "utf8")
	expect(source).toMatch(/<main id="content">\s*<div class="wrap"[^>]*>\s*<slot \/>\s*<\/div>\s*<\/main>/)
	const wrap = source.match(/\n\.wrap \{([^}]*)\}/)?.[1]
	expect(wrap).toMatch(/max-width:/)
	expect(wrap).toMatch(/padding:/)
})

test("AppLayout's wide prop marks the wrapper, which fills the width from the dock breakpoint", async () => {
	const container = await AstroContainer.create()
	const render = (wide?: boolean) =>
		container.renderToString(AppLayout, {
			props: { title: (m: Messages) => m.settings.title, current: "combi-name", ...(wide ? { wide } : {}) },
			slots: { default: "<p>Body</p>" },
		})
	const parse = (html: string) => new new Window().DOMParser().parseFromString(html, "text/html")
	expect(
		parse(await render(true))
			.querySelector("main#content > .wrap")
			?.hasAttribute("data-wide"),
	).toBe(true)
	expect(
		parse(await render())
			.querySelector("main#content > .wrap")
			?.hasAttribute("data-wide"),
	).toBe(false)
	const source = await readFile("src/layouts/AppLayout.astro", "utf8")
	expect(source).toMatch(/@media \(width >= 1100px\) \{\s*\.wrap\[data-wide\] \{[^}]*max-width: none/)
	// Below the dock breakpoint a wide page takes up to 1100px, room for the saved list's table.
	expect(source).toMatch(/@media \(width >= 700px\) \{\s*\.wrap\[data-wide\] \{[^}]*max-width: 1100px/)
})

test("AppLayout localizes the frame's attributes before it wires the frame", async () => {
	const source = await readFile("src/layouts/AppLayout.astro", "utf8")
	const localize = source.indexOf("localizeAttrs(document, currentLang(document))")
	expect(localize).toBeGreaterThan(-1)
	expect(source.indexOf("initFrame(document")).toBeGreaterThan(localize)
})

test("AppLayout re-syncs language and theme from storage on load and on a back-forward restore", async () => {
	const source = await readFile("src/layouts/AppLayout.astro", "utf8")
	const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? ""
	expect(script).toMatch(/import \{[^}]*\bsyncFromStorage\b[^}]*\bsyncOnRestore\b[^}]*\} from "#lib\/lang"/)
	expect(script).toContain("syncFromStorage(document, store)")
	expect(script).toContain("syncOnRestore(window, document, store)")
	expect(script.indexOf("syncFromStorage(document")).toBeLessThan(script.indexOf("initFrame(document"))
})

test("AppLayout takes its title as a Pick, shown in both languages", async () => {
	const container = await AstroContainer.create()
	const html = await container.renderToString(AppLayout, {
		props: { title: (m: Messages) => m.settings.title, current: "settings" },
		slots: { default: "<p>Body</p>" },
	})
	const doc = new new Window().DOMParser().parseFromString(html, "text/html")
	expect(doc.documentElement.getAttribute("data-title-en")).toBe("Settings")
	expect(doc.querySelector('.top-bar [data-lang="th"]')?.textContent).toBe("ตั้งค่า")
	expect(doc.querySelector('.top-bar [data-lang="en"]')?.textContent).toBe("Settings")
})

test("SettingsApp leaves the gutter to the frame", async () => {
	const source = await readFile("src/components/organisms/SettingsApp.svelte", "utf8")
	expect(source.match(/\n\.settings \{([^}]*)\}/)?.[1]).not.toMatch(/padding/)
})
