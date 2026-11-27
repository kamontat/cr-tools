import { cleanup, fireEvent, render, screen } from "@testing-library/svelte"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import HomeSaved from "#components/organisms/HomeSaved.svelte"
import { SAVED_KEY } from "#lib/combi/saved"
import { en } from "#lib/i18n/en"

const codes = ["1-MS0A000000", "1-MS0A000001", "1-MS0A000002", "1-MS0A000003", "1-MS0A000004"]

// The list is stored newest first, so the first entry is the latest.
const seed = (count: number) =>
	window.localStorage.setItem(
		SAVED_KEY,
		JSON.stringify(
			codes.slice(0, count).map((code, index) => ({
				code,
				description: `Note ${index}\nsecond line`,
				savedAt: 9000 - index,
			})),
		),
	)

const clipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard")

beforeEach(() => {
	window.localStorage.clear()
	document.documentElement.lang = "en"
})

afterEach(() => {
	cleanup()
	document.documentElement.lang = ""
	if (clipboard) Object.defineProperty(navigator, "clipboard", clipboard)
	else Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true, writable: true })
	vi.restoreAllMocks()
})

test("nothing shows with no saved codes", () => {
	const { container } = render(HomeSaved)
	expect(container.querySelector("section")).toBeNull()
	expect(screen.queryByText(en.home.saved.seeAll)).toBeNull()
})

test("five saved codes show three, newest first, with the note's first line", () => {
	seed(5)
	render(HomeSaved)
	const items = screen.getAllByRole("listitem")
	expect(items).toHaveLength(3)
	expect(items[0]?.textContent).toContain("MS0A000000")
	expect(items[0]?.textContent).toContain("Note 0")
	expect(items[0]?.textContent).not.toContain("second line")
	expect(items[2]?.textContent).toContain("Note 2")
})

test("each code is a card with its 10 characters as tiles and the shared Copy button", () => {
	seed(1)
	render(HomeSaved)
	expect(screen.getByRole("listitem").classList.contains("surface")).toBe(true)
	expect(screen.getByRole("img", { name: "MS0A000000" }).querySelectorAll(".tile")).toHaveLength(10)
	const copy = screen.getByRole("button", { name: en.combi.share.copyFull("MS0A000000") })
	expect(copy.classList.contains("btn")).toBe(true)
})

test("Copy copies the 10 characters", async () => {
	seed(2)
	const writeText = vi.fn().mockResolvedValue(undefined)
	Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true, writable: true })
	render(HomeSaved)
	await fireEvent.click(screen.getByRole("button", { name: en.combi.share.copyFull("MS0A000001") }))
	expect(writeText).toHaveBeenCalledWith("MS0A000001")
})

test("a refused clipboard tells the visitor the code to copy by hand", async () => {
	seed(1)
	Object.defineProperty(navigator, "clipboard", {
		value: { writeText: vi.fn().mockRejectedValue(new Error("no")) },
		configurable: true,
		writable: true,
	})
	render(HomeSaved)
	await fireEvent.click(screen.getByRole("button", { name: /Copy/ }))
	expect(await screen.findByText(en.combi.notices.copyBlocked("MS0A000000"))).toBeTruthy()
})

test("See all goes to /combi-name/", () => {
	seed(1)
	render(HomeSaved)
	expect(screen.getByRole("link", { name: en.home.saved.seeAll }).getAttribute("href")).toBe("/combi-name/")
})
