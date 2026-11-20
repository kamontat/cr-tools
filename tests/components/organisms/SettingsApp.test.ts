import { fireEvent, render, screen, within } from "@testing-library/svelte"
import { afterEach, beforeEach, expect, test } from "vitest"

import SettingsApp from "#components/organisms/SettingsApp.svelte"

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
})

afterEach(() => {
	document.body.innerHTML = ""
})

test("choosing Light applies and stores it; System clears both", async () => {
	render(SettingsApp, { props: { env: production } })
	await fireEvent.click(screen.getByRole("button", { name: "Light" }))
	expect(document.documentElement.getAttribute("data-theme")).toBe("light")
	expect(window.localStorage.getItem("theme")).toBe("light")

	await fireEvent.click(screen.getByRole("button", { name: "System" }))
	expect(document.documentElement.hasAttribute("data-theme")).toBe(false)
	expect(window.localStorage.getItem("theme")).toBeNull()
})

test("the stored theme is the pressed one on load", () => {
	window.localStorage.setItem("theme", "dark")
	render(SettingsApp, { props: { env: production } })
	expect(screen.getByRole("button", { name: "Dark" }).getAttribute("aria-pressed")).toBe("true")
})

test("production About row shows the short commit and opens the full list", async () => {
	render(SettingsApp, { props: { env: production } })
	await fireEvent.click(screen.getByRole("button", { name: /Production · 0123456/ }))
	const dialog = screen.getByRole("dialog", { name: "About" })
	expect(terms(dialog)).toEqual(["Environment", "Built", "Source", "Commit", "Changelog"])
	const link = within(dialog).getByRole("link", { name: "CHANGELOG.md" })
	expect(link.getAttribute("target")).toBe("_blank")
	expect(link.getAttribute("rel")).toBe("noopener")
})

test("development lists only Environment and Source", async () => {
	render(SettingsApp, { props: { env: { dev: true } } })
	await fireEvent.click(screen.getByRole("button", { name: /Development/ }))
	expect(terms(screen.getByRole("dialog", { name: "About" }))).toEqual(["Environment", "Source"])
})
