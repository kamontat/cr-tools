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

test("the help is hidden, then shows on toggle with the right id", async () => {
	const { container } = render(Field, { props })
	expect(screen.queryByText("What the run aims for.")).toBeNull()
	const toggle = screen.getByRole("button", { name: "About goal" })
	expect(toggle.getAttribute("aria-expanded")).toBe("false")
	expect(toggle.getAttribute("aria-controls")).toBe("goal-help")

	await fireEvent.click(toggle)
	const help = screen.getByText("What the run aims for.")
	expect(help.id).toBe("goal-help")
	expect(toggle.getAttribute("aria-expanded")).toBe("true")
	expect(container.querySelector("#goal-help")).toBe(help)

	await fireEvent.click(toggle)
	expect(screen.queryByText("What the run aims for.")).toBeNull()
})

test("a note shows as its own line, and none without one", async () => {
	const { rerender } = render(Field, { props })
	expect(screen.queryByText("Special Episode 1 takes none.")).toBeNull()
	await rerender({ ...props, note: "Special Episode 1 takes none." })
	expect(screen.getByText("Special Episode 1 takes none.")).toBeTruthy()
})
