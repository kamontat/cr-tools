import { fireEvent, render, screen } from "@testing-library/svelte"
import { afterEach, expect, test, vi } from "vitest"

import CodeDisplay from "#components/molecules/CodeDisplay.svelte"
import { encodeFull } from "#lib/combi/full-code"
import { hintsFor } from "#lib/combi/hints"
import { emptyLoadout } from "#lib/combi/loadout"
import { en } from "#lib/i18n/en"

afterEach(() => {
	document.body.innerHTML = ""
})

const CODE = encodeFull({
	loadout: { ...emptyLoadout(), cookie: "01", pet: "01" },
	combi: {
		goals: ["money"],
		mode: "auto",
		episode: "episode7",
		floor: null,
		boosts: [],
		randomBoost: null,
		cookiePowers: [],
		action: "none",
	},
})
const GAME = CODE.slice(CODE.lastIndexOf("-") + 1)
const hints = hintsFor(CODE, en)
const INERT = new Set(["reserved", "version", "separator"])

function setup(canJump = (group: string) => !INERT.has(group)) {
	const onjump = vi.fn()
	const result = render(CodeDisplay, {
		props: { code: CODE, summary: "Money · EP. 7", hints, onjump, canJump },
	})
	return { ...result, onjump }
}

const hintOf = (group: string) => {
	const found = hints.find((h) => h.group === group)
	if (found === undefined) throw new Error(`no ${group} hint`)
	return found
}

test("the fixture has a loadout and hints for every character", () => {
	expect(GAME).toHaveLength(10)
	expect(CODE.length).toBeGreaterThan(11)
	expect(hints.map((h) => h.char).join("")).toBe(CODE)
})

test("the 10 game characters show large, and the summary and full code small", () => {
	const { container } = setup()
	const big = container.querySelector(".code-big") as Element
	expect(big.textContent?.replace(/\s/g, "")).toBe(GAME)
	expect(screen.getByText("Money · EP. 7")).toBeTruthy()
	const full = container.querySelector(".code-full") as Element
	expect(full.textContent?.replace(/\s/g, "")).toBe(CODE)
})

test("a jumpable group is a button titled with its hint that calls onjump with its group", async () => {
	const { container, onjump } = setup()
	const big = container.querySelector(".code-big") as Element
	const episode = hintOf("episode")
	const button = [...big.querySelectorAll("button")].find((b) => b.getAttribute("title") === episode.hint)
	if (button === undefined) throw new Error("no episode button")
	expect(button.textContent?.trim()).toBe(episode.char)
	await fireEvent.click(button)
	expect(onjump).toHaveBeenCalledWith("episode")
})

test("a group's characters are one element", () => {
	const { container } = setup()
	const big = container.querySelector(".code-big") as Element
	const goal = [...big.children].find((el) => el.getAttribute("title") === hintOf("goal").hint)
	expect(goal?.textContent?.trim()).toHaveLength(2)
})

test("an inert group is a span", () => {
	const { container, onjump } = setup((group) => group === "episode")
	const big = container.querySelector(".code-big") as Element
	expect(big.querySelectorAll("button")).toHaveLength(1)
	const mode = [...big.children].find((el) => el.getAttribute("title") === hintOf("mode").hint)
	expect(mode?.tagName).toBe("SPAN")
	expect(onjump).not.toHaveBeenCalled()
})

test("the loadout groups in the full code jump too", async () => {
	const { container, onjump } = setup()
	const full = container.querySelector(".code-full") as Element
	const pet = hintOf("pet")
	const button = [...full.querySelectorAll("button")].find((b) => b.getAttribute("title") === pet.hint)
	if (button === undefined) throw new Error("no pet button")
	await fireEvent.click(button)
	expect(onjump).toHaveBeenCalledWith("pet")
})

test("without hints the characters still show, inert", () => {
	const { container } = render(CodeDisplay, {
		props: { code: "ABCDEFGHIJ", summary: "", hints: [], onjump: vi.fn(), canJump: () => true },
	})
	expect(container.querySelector(".code-big")?.textContent?.replace(/\s/g, "")).toBe("ABCDEFGHIJ")
	expect(container.querySelector("button")).toBeNull()
	expect(container.querySelector(".code-full")).toBeNull()
})
