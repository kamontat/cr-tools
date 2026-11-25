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

const terms = (root: HTMLElement) => [...root.querySelectorAll("dt")].map((t) => t.textContent)

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
	await fireEvent.click(screen.getByRole("button", { name: /Production · 0123456/ }))
	const dialog = screen.getByRole("dialog", { name: "About" })
	expect(terms(dialog)).toEqual(["Environment", "Built", "Source", "Commit", "Changelog"])
	const link = within(dialog).getByRole("link", { name: "CHANGELOG.md" })
	expect(link.getAttribute("target")).toBe("_blank")
	expect(link.getAttribute("rel")).toBe("noopener")
})

test("development lists only Environment and Source", async () => {
	english()
	render(SettingsApp, { props: { env: { dev: true } } })
	await fireEvent.click(screen.getByRole("button", { name: /Development/ }))
	expect(terms(screen.getByRole("dialog", { name: "About" }))).toEqual(["Environment", "Source"])
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
	await fireEvent.click(screen.getByRole("button", { name: /ใช้งานจริง · 0123456/ }))
	applyLang("en", document)
	await tick()
	const dialog = screen.getByRole("dialog")
	expect(terms(dialog)).toEqual(["Environment", "Built", "Source", "Commit", "Changelog"])
	expect(within(dialog).getByRole("button", { name: "Close" })).toBeTruthy()
})

test("Built follows the language's date format", async () => {
	render(SettingsApp, { props: { env: production } })
	await fireEvent.click(screen.getByRole("button", { name: /ใช้งานจริง/ }))
	const built = () => screen.getByRole("dialog").querySelectorAll("dd")[1]?.textContent ?? ""
	expect(built()).toContain("พ.ย.")
	expect(built()).toContain("2026")
	expect(built()).not.toContain("2569")
	applyLang("en", document)
	await tick()
	expect(built()).toContain("Nov")
	expect(built()).toContain("2026")
})
