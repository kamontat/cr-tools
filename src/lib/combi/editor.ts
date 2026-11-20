/**
 * What the editor draws from a draft that is more than one setter: the
 * pickers' options, the verdict and the episode's notes in words, and where a
 * click on the code display leads. Kept here, out of the Svelte script blocks,
 * so `astro check` reads it and a test needs no DOM.
 */

import type { Messages } from "#lib/i18n/messages"
import type { CatalogSection } from "./catalog"
import type { Draft, ReasonId } from "./draft"
import type { TreasurePick } from "./loadout"
import type { TabName } from "./state"

import { anyIdFor, imageFor, isAnyId, labelFor, optionsFor } from "./catalog"
import { limitsFor, tabEnabled, verdictOf } from "./draft"
import { BOOST_LABELS, EPISODE_LABELS, RANDOM_BOOST_LABELS } from "./labels"

/** Where `public/assets/` is served; every icon path the catalog gives is relative to it. */
export const ASSET_BASE = "/assets/"

/** One cell of a picker: an id, the name it shows, and its icon, if any. */
export type EntryOption = { id: string; name: string; src: string | null }

export function entryOf(section: CatalogSection, id: string): EntryOption {
	const image = imageFor(section, id)
	return { id, name: labelFor(section, id), src: image === null ? null : ASSET_BASE + image }
}

const LIVE = new Map<CatalogSection, EntryOption[]>()

/** The live entries, built once per section: they never change while the page is open. */
function live(section: CatalogSection): EntryOption[] {
	let options = LIVE.get(section)
	if (options === undefined) {
		options = optionsFor(section).map(([id, name, image]) => ({
			id,
			name,
			src: image === null ? null : ASSET_BASE + image,
		}))
		LIVE.set(section, options)
	}
	return options
}

/**
 * A picker's options: Any first when it is named, the live entries in id
 * order, then every id the build carries that the list no longer offers — a
 * retired one — so a saved build still shows, and keeps, what it holds.
 */
export function entryOptions(
	section: CatalogSection,
	carried: readonly (string | null)[],
	anyName?: string,
): EntryOption[] {
	const base = live(section)
	const known = new Set(base.map((option) => option.id))
	const extra: EntryOption[] = []
	for (const id of carried) {
		if (id === null || isAnyId(section, id) || known.has(id)) continue
		known.add(id)
		extra.push(entryOf(section, id))
	}
	const any = anyName === undefined ? [] : [{ id: anyIdFor(section), name: anyName, src: null }]
	return [...any, ...base, ...extra]
}

/** Every treasure id the draft's slots hold, for `entryOptions`. */
export function carriedTreasures(draft: Draft): string[] {
	return draft.picks.loadout.treasures.flatMap((slot: TreasurePick[]) => slot.map((pick) => pick.id))
}

function reasonText(reason: ReasonId, draft: Draft, m: Messages): string {
	const { combi } = draft.full
	if (reason === "fastStart") return BOOST_LABELS.fastStart
	if (reason === "randomBoost") return combi.randomBoost === null ? "" : RANDOM_BOOST_LABELS[combi.randomBoost]
	if (reason === "action") return m.combi.actions[combi.action]
	return m.combi.describe.relayCookie
}

/** The line under Mode: why an auto run needs a hand, or that it needs none; empty for a manual run. */
export function verdictText(draft: Draft, m: Messages): string {
	const verdict = verdictOf(draft)
	if (verdict === null) return ""
	if (!verdict.semi) return m.combi.editor.verdictAuto
	const reasons = verdict.reasons.map((reason) => reasonText(reason, draft, m))
	return m.combi.editor.verdictSemi(reasons.join(m.combi.editor.reasonsJoin))
}

export function episodeName(draft: Draft): string {
	return EPISODE_LABELS[draft.full.combi.episode]
}

/** What the episode leaves out, said under Episode, where the tab it switches off cannot say it. */
export function episodeNote(draft: Draft, m: Messages): string {
	const limits = limitsFor(draft)
	const name = episodeName(draft)
	const notes: string[] = []
	if (!limits.boosts) notes.push(m.combi.editor.takesNoBoosts(name))
	if (!limits.treasures) notes.push(m.combi.editor.takesNoTreasures(name))
	return notes.join(" ")
}

/** Which tab owns each group of the code's characters; a group not here (version, separator, reserved) is inert. */
const JUMP_TABS: Readonly<Record<string, TabName>> = {
	mode: "main",
	goal: "main",
	episode: "main",
	floor: "main",
	action: "main",
	cookie: "cookies",
	relay: "cookies",
	pet: "cookies",
	treasures: "treasures",
	treasureOrder: "treasures",
	treasure1: "treasures",
	treasure2: "treasures",
	treasure3: "treasures",
	boosts: "boosts",
	randomBoost: "boosts",
	cookiePowers: "boosts",
}

export function jumpTab(group: string): TabName | null {
	return Object.hasOwn(JUMP_TABS, group) ? (JUMP_TABS[group] ?? null) : null
}

/** Whether a click on a group can lead to a control: one owns it, and the episode has room for it. */
export function canJump(draft: Draft, group: string): boolean {
	const tab = jumpTab(group)
	if (tab === null || !tabEnabled(draft, tab)) return false
	if (group === "relay" && !limitsFor(draft).relay) return false
	return true
}
