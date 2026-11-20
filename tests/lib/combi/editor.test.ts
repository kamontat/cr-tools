import { expect, test } from "vitest"

import { anyIdFor, optionsFor } from "#lib/combi/catalog"
import { newDraft, setEpisode, setMode, setRandomBoost, setRole } from "#lib/combi/draft"
import { canJump, entryOptions, episodeNote, jumpTab, verdictText } from "#lib/combi/editor"
import { EPISODE_LABELS, RANDOM_BOOST_LABELS } from "#lib/combi/labels"
import { en } from "#lib/i18n/en"

test("a picker lists Any first, then the live entries", () => {
	const options = entryOptions("pets", [], "Any pet")
	expect(options[0]).toEqual({ id: anyIdFor("pets"), name: "Any pet", src: null })
	expect(options.length).toBe(optionsFor("pets").length + 1)
	expect(options[1]?.src?.startsWith("/assets/")).toBe(true)
})

test("a carried id the list does not offer is appended, once", () => {
	const options = entryOptions("pets", ["ZZ", "ZZ", null, anyIdFor("pets")])
	expect(options.filter((option) => option.id === "ZZ")).toHaveLength(1)
	expect(options.at(-1)?.id).toBe("ZZ")
	expect(options.some((option) => option.id === anyIdFor("pets"))).toBe(false)
})

test("the verdict is empty by hand, full auto alone, and names what needs a hand", () => {
	expect(verdictText(newDraft(), en)).toBe("")
	const auto = setMode(newDraft(), "auto")
	expect(verdictText(auto, en)).toBe(en.combi.editor.verdictAuto)
	const semi = setRole(setRandomBoost(auto, "doubleCoins"), "relay", "01")
	expect(verdictText(semi, en)).toBe(
		en.combi.editor.verdictSemi(`${RANDOM_BOOST_LABELS.doubleCoins}, ${en.combi.describe.relayCookie}`),
	)
})

test("the episode note says what the episode leaves out", () => {
	expect(episodeNote(newDraft(), en)).toBe("")
	const name = EPISODE_LABELS.specialExp
	expect(episodeNote(setEpisode(newDraft(), "specialExp"), en)).toBe(
		`${en.combi.editor.takesNoBoosts(name)} ${en.combi.editor.takesNoTreasures(name)}`,
	)
})

test("groups lead to their tab, and inert or switched-off groups lead nowhere", () => {
	expect(jumpTab("episode")).toBe("main")
	expect(jumpTab("treasure2")).toBe("treasures")
	expect(jumpTab("separator")).toBeNull()
	expect(canJump(newDraft(), "relay")).toBe(true)
	expect(canJump(newDraft(), "reserved")).toBe(false)
	const special = setEpisode(newDraft(), "special1")
	expect(canJump(special, "relay")).toBe(false)
	expect(canJump(special, "boosts")).toBe(false)
	expect(canJump(special, "treasure1")).toBe(true)
})
