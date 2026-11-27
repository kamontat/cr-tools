import { render, screen } from "@testing-library/svelte"
import { afterEach, expect, test } from "vitest"

import CodeTiles from "#components/atoms/CodeTiles.svelte"

afterEach(() => {
	document.body.innerHTML = ""
})

test("draws one tile per character, named as one code", () => {
	render(CodeTiles, { props: { code: "CRx7Lq2Mz9" } })
	const tiles = screen.getByRole("img", { name: "CRx7Lq2Mz9" })
	const chars = [...tiles.querySelectorAll(".tile")].map((tile) => tile.textContent)
	expect(chars).toEqual(["C", "R", "x", "7", "L", "q", "2", "M", "z", "9"])
})

test("a label names it in place of the code", () => {
	render(CodeTiles, { props: { code: "AB", label: "Combi name AB" } })
	expect(screen.getByRole("img", { name: "Combi name AB" })).toBeTruthy()
})

test("the tiles read as the code when copied: no text between them", () => {
	render(CodeTiles, { props: { code: "Ab4kT9qWe2" } })
	expect(screen.getByRole("img").textContent).toBe("Ab4kT9qWe2")
})
