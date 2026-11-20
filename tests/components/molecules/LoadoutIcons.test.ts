import { render } from "@testing-library/svelte"
import { afterEach, expect, test } from "vitest"

import LoadoutIcons from "#components/molecules/LoadoutIcons.svelte"

afterEach(() => {
	document.body.innerHTML = ""
})

const loadout = {
	cookie: { src: "/assets/brave.png", name: "Brave" },
	pet: { src: "/assets/pet.png", name: "Hero", round: true as const },
	treasures: [
		{ src: "/assets/a.png", name: "Bear Jelly Parfait", more: 1 },
		{ src: null, name: "Lucky Dice" },
	],
}

const items = (root: Element) =>
	[...root.children].map((el) =>
		el.matches(".divider") ? "|" : (el.querySelector("[title]") ?? el).getAttribute("title"),
	)

test("the cookie, then the round pet, a divider, and one icon per slot with its +n", () => {
	const { container } = render(LoadoutIcons, { props: { loadout } })
	const root = container.querySelector(".loadout") as Element
	expect(items(root)).toEqual(["Brave", "Hero", "|", "Bear Jelly Parfait", "Lucky Dice"])

	expect(root.querySelector('[title="Hero"]')?.classList.contains("round")).toBe(true)
	expect(root.querySelector('[title="Brave"]')?.classList.contains("round")).toBe(false)

	const badges = [...root.querySelectorAll(".more")].map((el) => el.textContent?.trim())
	expect(badges).toEqual(["+1"])
})

test("a pet is round even when the icon does not say so", () => {
	const { container } = render(LoadoutIcons, {
		props: { loadout: { ...loadout, pet: { src: "/assets/pet.png", name: "Hero" } } },
	})
	expect(container.querySelector('[title="Hero"]')?.classList.contains("round")).toBe(true)
})

test("no treasures, no divider", () => {
	const { container } = render(LoadoutIcons, { props: { loadout: { ...loadout, treasures: [] } } })
	expect(container.querySelector(".divider")).toBeNull()
})

test("the size reaches every icon", () => {
	const { container } = render(LoadoutIcons, { props: { loadout, size: 20 } })
	expect(container.querySelector('[title="Brave"]')?.getAttribute("width")).toBe("20")
})

test("null renders nothing", () => {
	const { container } = render(LoadoutIcons, { props: { loadout: null } })
	expect(container.querySelector(".loadout")).toBeNull()
	expect(container.querySelector("[title]")).toBeNull()
})
