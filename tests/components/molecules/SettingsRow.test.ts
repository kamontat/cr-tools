import { fireEvent, render, screen } from "@testing-library/svelte"
import { createRawSnippet } from "svelte"
import { afterEach, expect, test } from "vitest"

import SettingsRow from "#components/molecules/SettingsRow.svelte"

const children = createRawSnippet(() => ({ render: () => `<p>Inside the row</p>` }))
const aside = createRawSnippet(() => ({ render: () => `<span>Under the label</span>` }))

afterEach(() => {
	document.body.innerHTML = ""
})

test("closed, it is a button named by the label with no body", () => {
	render(SettingsRow, { props: { label: "Storage", value: "1 kB / 5 MB", children } })
	// The folded value is heard with the label.
	const row = screen.getByRole("button", { name: "Storage 1 kB / 5 MB" })
	expect(row.getAttribute("aria-expanded")).toBe("false")
	expect(screen.queryByText("Inside the row")).toBeNull()
	expect(screen.getByText("1 kB / 5 MB")).toBeTruthy()
})

test("a press opens the body in place, a second press folds it", async () => {
	render(SettingsRow, { props: { label: "Storage", children } })
	const row = screen.getByRole("button", { name: "Storage" })

	await fireEvent.click(row)
	expect(row.getAttribute("aria-expanded")).toBe("true")
	const body = screen.getByRole("region", { name: "Storage" })
	expect(body.id).not.toBe("")
	expect(row.getAttribute("aria-controls")).toBe(body.id)
	expect(body.textContent).toContain("Inside the row")

	await fireEvent.click(row)
	expect(row.getAttribute("aria-expanded")).toBe("false")
	expect(screen.queryByText("Inside the row")).toBeNull()
})

test("never a pop-up", async () => {
	render(SettingsRow, { props: { label: "Storage", children } })
	await fireEvent.click(screen.getByRole("button", { name: "Storage" }))
	expect(screen.queryByRole("dialog")).toBeNull()
})

test("it can start open, and the aside shows under the label", () => {
	render(SettingsRow, { props: { label: "Storage", open: true, aside, children } })
	expect(screen.getByText("Under the label")).toBeTruthy()
	expect(screen.getByText("Inside the row")).toBeTruthy()
})

test("it is a Surface row, so rows stand apart as cards", () => {
	const { container } = render(SettingsRow, { props: { label: "Storage", children } })
	const item = container.querySelector(".item")
	expect(item?.classList.contains("surface")).toBe(true)
	expect(item?.classList.contains("row")).toBe(true)
})

test("two rows have different body ids", async () => {
	render(SettingsRow, { props: { label: "One", open: true, children } })
	render(SettingsRow, { props: { label: "Two", open: true, children } })
	const [one, two] = screen.getAllByRole("region")
	expect(one?.id).not.toBe(two?.id)
})
