import { fireEvent, render, screen } from "@testing-library/svelte"
import { createRawSnippet } from "svelte"
import { afterEach, expect, test } from "vitest"

import Field from "#components/molecules/Field.svelte"

const children = createRawSnippet(() => ({ render: () => `<input aria-label="Inside">` }))
const props = { id: "goal", label: "Goal", help: "What the run aims for.", helpLabel: "About goal", children }

afterEach(() => {
	document.body.innerHTML = ""
})

test("the label names the group and the children render inside it", () => {
	render(Field, { props })
	const group = screen.getByRole("group", { name: "Goal" })
	expect(group.contains(screen.getByLabelText("Inside"))).toBe(true)
})

test("the help is in the page but hidden, then shows on toggle; aria-controls names it", async () => {
	const { container } = render(Field, { props })
	const help = container.querySelector("#goal-help") as HTMLElement
	expect(help.textContent).toBe("What the run aims for.")
	expect(help.hidden).toBe(true)
	const toggle = screen.getByRole("button", { name: "About goal" })
	expect(toggle.getAttribute("aria-expanded")).toBe("false")
	expect(toggle.getAttribute("aria-controls")).toBe("goal-help")

	await fireEvent.click(toggle)
	expect(help.hidden).toBe(false)
	expect(toggle.getAttribute("aria-expanded")).toBe("true")

	await fireEvent.click(toggle)
	expect(help.hidden).toBe(true)
})

test("a note shows as its own line, and none without one", async () => {
	const { rerender } = render(Field, { props })
	expect(screen.queryByText("Special Episode 1 takes none.")).toBeNull()
	await rerender({ ...props, note: "Special Episode 1 takes none." })
	expect(screen.getByText("Special Episode 1 takes none.")).toBeTruthy()
})
