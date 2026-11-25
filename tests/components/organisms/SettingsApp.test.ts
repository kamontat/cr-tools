process.env["TZ"] = "Asia/Bangkok"

import { fireEvent, render, screen, within } from "@testing-library/svelte"
import { tick } from "svelte"
import { afterEach, beforeEach, expect, test } from "vitest"

import SettingsApp from "#components/organisms/SettingsApp.svelte"
import { applyLang } from "#lib/lang"

const production = {
	dev: false,
	deploy: "production",
	commit: "0123456789abcdef",
	builtAt: "2026-11-19T10:00:00Z",
}

/** The open body of the row with this name; the page's own sections are regions too. */
const body = (name: string | RegExp) => {
	const id = screen.getByRole("button", { name }).getAttribute("aria-controls") as string
	return document.getElementById(id) as HTMLElement
}

const terms = (root: HTMLElement) => [...root.querySelectorAll("dt")].map((t) => t.textContent)

const saved = JSON.stringify([
	{ code: "1-MS0A000000", description: "a", savedAt: 1764000000000 },
	{ code: "1-MM0A000000", description: "", savedAt: 1764100000000 },
])

beforeEach(() => {
	window.localStorage.clear()
	document.documentElement.removeAttribute("data-theme")
	document.documentElement.lang = "th"
})

const english = () => {
	document.documentElement.lang = "en"
}

afterEach(() => {
	document.body.innerHTML = ""
})

test("choosing Light applies and stores it; System clears both", async () => {
	english()
	render(SettingsApp, { props: { env: production } })
	await fireEvent.click(screen.getByRole("button", { name: "Light" }))
	expect(document.documentElement.getAttribute("data-theme")).toBe("light")
	expect(window.localStorage.getItem("theme")).toBe("light")

	await fireEvent.click(screen.getByRole("button", { name: "System" }))
	expect(document.documentElement.hasAttribute("data-theme")).toBe(false)
	expect(window.localStorage.getItem("theme")).toBeNull()
})

test("the stored theme is the pressed one on load", () => {
	english()
	window.localStorage.setItem("theme", "dark")
	render(SettingsApp, { props: { env: production } })
	expect(screen.getByRole("button", { name: "Dark" }).getAttribute("aria-pressed")).toBe("true")
})

test("production About row shows the short commit and opens the full list", async () => {
	english()
	render(SettingsApp, { props: { env: production } })
	expect(screen.getByText(/Production · 0123456/)).toBeTruthy()
	await fireEvent.click(screen.getByRole("button", { name: "About" }))
	expect(screen.queryByRole("dialog")).toBeNull()
	const dialog = body("About")
	expect(terms(dialog)).toEqual(["Environment", "Built", "Source", "Commit", "Changelog"])
	const link = within(dialog).getByRole("link", { name: "CHANGELOG.md" })
	expect(link.getAttribute("target")).toBe("_blank")
	expect(link.getAttribute("rel")).toBe("noopener")
})

test("development lists only Environment and Source", async () => {
	english()
	render(SettingsApp, { props: { env: { dev: true } } })
	await fireEvent.click(screen.getByRole("button", { name: "About" }))
	expect(terms(body("About"))).toEqual(["Environment", "Source"])
})

test("starts in Thai", () => {
	render(SettingsApp, { props: { env: production } })
	// The top bar carries the page's title; the page repeats it nowhere.
	expect(screen.queryByRole("heading", { level: 1 })).toBeNull()
	expect(screen.getByRole("heading", { level: 2, name: "การแสดงผล" })).toBeTruthy()
	expect(screen.getByRole("button", { name: "ไทย" }).getAttribute("aria-pressed")).toBe("true")
	expect(screen.getByRole("button", { name: "English" }).getAttribute("aria-pressed")).toBe("false")
	expect(screen.getByRole("button", { name: "ตามระบบ" })).toBeTruthy()
})

test("each language button is marked in its own language, whatever the page's", () => {
	english()
	render(SettingsApp, { props: { env: production } })
	expect(screen.getByRole("button", { name: "ไทย" }).getAttribute("lang")).toBe("th")
	expect(screen.getByRole("button", { name: "English" }).getAttribute("lang")).toBe("en")
	expect(screen.getByRole("button", { name: "Dark" }).hasAttribute("lang")).toBe(false)
})

test("choosing English switches the page in place and remembers it", async () => {
	render(SettingsApp, { props: { env: production } })
	await fireEvent.click(screen.getByRole("button", { name: "English" }))
	expect(document.documentElement.lang).toBe("en")
	expect(window.localStorage.getItem("lang")).toBe("en")
	expect(screen.getByRole("heading", { level: 2, name: "Appearance" })).toBeTruthy()
	expect(screen.getByRole("button", { name: "System" })).toBeTruthy()
})

test("with About open, switching language re-renders it", async () => {
	render(SettingsApp, { props: { env: production } })
	await fireEvent.click(screen.getByRole("button", { name: "เกี่ยวกับ" }))
	applyLang("en", document)
	await tick()
	const dialog = body(/^(About|เกี่ยวกับ)$/)
	expect(terms(dialog)).toEqual(["Environment", "Built", "Source", "Commit", "Changelog"])
})

test("Built follows the language's date format", async () => {
	render(SettingsApp, { props: { env: production } })
	await fireEvent.click(screen.getByRole("button", { name: "เกี่ยวกับ" }))
	const built = () => body(/^(About|เกี่ยวกับ)$/).querySelectorAll("dd")[1]?.textContent ?? ""
	expect(built()).toContain("พ.ย.")
	expect(built()).toContain("2026")
	expect(built()).not.toContain("2569")
	applyLang("en", document)
	await tick()
	expect(built()).toContain("Nov")
	expect(built()).toContain("2026")
})

test("the data rows and About are buttons that fold in place, with no dialog", async () => {
	english()
	render(SettingsApp, { props: { env: production } })
	expect(screen.getByRole("heading", { level: 2, name: "Combi codes data" })).toBeTruthy()
	for (const name of [/^Storage/, /^Back up/, /^Restore/, /^Delete all/, /^About/]) {
		const row = screen.getByRole("button", { name })
		expect(row.getAttribute("aria-expanded")).toBe("false")
	}
	await fireEvent.click(screen.getByRole("button", { name: /^Back up/ }))
	expect(screen.getByRole("button", { name: /^Back up/ }).getAttribute("aria-expanded")).toBe("true")
	expect(screen.queryByRole("dialog")).toBeNull()
})

test("the Storage row shows its use and a bar", () => {
	english()
	window.localStorage.setItem("combi-name:saved:v2", saved)
	render(SettingsApp, { props: { env: production } })
	expect(screen.getByRole("button", { name: /^Storage/ }).textContent).toMatch(/\/ .*\(\d+%\)/)
	const bar = screen.getByRole("meter")
	expect(bar.getAttribute("aria-valuemin") ?? bar.getAttribute("min")).toBe("0")
})

test("restoring through the box updates the Storage row's code count", async () => {
	english()
	render(SettingsApp, { props: { env: production } })
	await fireEvent.click(screen.getByRole("button", { name: /^Storage/ }))
	expect(screen.getByText("Saved codes").nextElementSibling?.textContent).toBe("0")
	await fireEvent.click(screen.getByRole("button", { name: /^Restore/ }))
	await fireEvent.click(screen.getByRole("button", { name: /by hand/i }))
	await fireEvent.input(screen.getByRole("textbox"), { target: { value: "1-MS0A000000\n1-MM0A000000" } })
	await fireEvent.click(screen.getAllByRole("button", { name: /^Restore$/ }).at(-1) as HTMLElement)
	expect(screen.getByText("Saved codes").nextElementSibling?.textContent).toBe("2")
})
