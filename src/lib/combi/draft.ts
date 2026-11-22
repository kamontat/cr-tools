/**
 * The build the editor holds while someone works on it: the full code, the note
 * and the rounds beside it, and which saved entry it came from. The editor
 * drives it through the setters below and draws whatever they return.
 *
 * A draft holds two builds. `picks` is what someone chose, kept whole: a pick
 * the episode or the mode has no room for — a relay on Special Episode 1, an
 * action on a manual run, the floor off the tower — stays there, so switching
 * back brings it back, the way the old page's disabled controls kept their
 * values. `full` is the build as its code can say it (`normalize`,
 * `fitLoadout`), recomputed from `picks` by every setter, and it is the only
 * one the code, the verdict, the badges and `isDirty` read. That is the old
 * page's form rules without the form — its chips, grids and cards, read by
 * `readForm` and `readLoadout`, written by `writeForm`.
 *
 * Every setter returns a new draft.
 */

import type { Issue } from "./issues"
import type { SavedCode } from "./saved"
import type { TabName } from "./state"

import {
	type Action,
	ALL_BOOSTS,
	ALL_COOKIE_POWERS,
	AUTO_GOALS,
	type Boost,
	type Combi,
	type CookiePower,
	type Episode,
	type EpisodeLimits,
	type Goal,
	limitsOf,
	MANUAL_GOALS,
	type Mode,
	normalize,
	type RandomBoost,
	SOLO_GOAL,
} from "./codec"
import { carriesRelay, decodeFull, encodeFull, type FullCode, fitLoadout, isSemiAutoBuild } from "./full-code"
import { emptyLoadout, type Loadout, MAX_TREASURE_SLOTS, type TreasurePick } from "./loadout"
import { isEmptyRound, type Round, type RoundDraft } from "./rounds"
import { cleanDescription } from "./saved"
import { STAT_FIELDS, type StatField } from "./stats"

export type Draft = {
	/** What was chosen, including what the episode or mode cannot use, for held values in disabled controls. */
	picks: FullCode
	/** The build as its code says it, derived from `picks`. */
	full: FullCode
	note: string
	/** Every round in the Run log, blank ones included; `keptRounds` is what a save keeps. */
	rounds: RoundDraft[]
	/** The saved code being edited, or null for a new one. */
	from: string | null
}

/** Why an auto run needs a hand, as ids the page words from the catalogue. */
export type ReasonId = "fastStart" | "randomBoost" | "action" | "relay"

export type BuildVerdict = {
	semi: boolean
	/** Empty when the build plays itself all the way. */
	reasons: ReasonId[]
}

/** The highest tower floor a code can say. */
const FLOOR_MAX = 100

/** A pickable mode: semi-auto is derived, never chosen, so it reads as auto. */
function pickable(mode: Mode): Mode {
	return mode === "semiauto" ? "auto" : mode
}

function goalsFor(mode: Mode): readonly Goal[] {
	return mode === "manual" ? MANUAL_GOALS : AUTO_GOALS
}

/**
 * The goals a set keeps under the goals its mode offers, in table order. A set
 * the options leave empty falls to the first one offered — an auto run aiming
 * for Score lands on Money, as the old goal row did.
 */
function fitGoals(goals: readonly Goal[], mode: Mode): Goal[] {
	const options = goalsFor(mode)
	const kept = options.filter((goal) => goals.includes(goal))
	if (kept.length > 0) return kept
	return options[0] === undefined ? [] : [options[0]]
}

/** The picks as their code can say them, and nothing it cannot. */
function settle(picks: FullCode): FullCode {
	const mode = pickable(picks.combi.mode)
	const combi = normalize({ ...picks.combi, mode, goals: fitGoals(picks.combi.goals, mode) })
	return { combi, loadout: fitLoadout(picks.loadout, combi) }
}

/** A draft over these picks, its `full` derived from them. */
function over(draft: Omit<Draft, "full">): Draft {
	return { ...draft, full: settle(draft.picks) }
}

function withCombi(draft: Draft, change: Partial<Combi>): Draft {
	return over({ ...draft, picks: { ...draft.picks, combi: { ...draft.picks.combi, ...change } } })
}

function withLoadout(draft: Draft, change: Partial<Loadout>): Draft {
	return over({ ...draft, picks: { ...draft.picks, loadout: { ...draft.picks.loadout, ...change } } })
}

/** The page's opening build: a manual run aiming for Score, any episode, nothing carried. */
export function newDraft(): Draft {
	return over({
		picks: {
			combi: {
				goals: [SOLO_GOAL],
				mode: "manual",
				episode: "any",
				floor: null,
				boosts: [],
				randomBoost: null,
				cookiePowers: [],
				action: "none",
			},
			loadout: emptyLoadout(),
		},
		note: "",
		rounds: [],
		from: null,
	})
}

/** A draft of any code, with the note and rounds a link brought. Throws `CodeError` when the code does not read. */
export function draftFromCode(
	code: string,
	note = "",
	rounds: readonly Round[] = [],
): { draft: Draft; warnings: Issue[] } {
	const { full, warnings } = decodeFull(code)
	// A semi-auto code lands on auto: semi-auto is what the build makes of an
	// auto run, not a mode anyone picks.
	const picks = { ...full, combi: { ...full.combi, mode: pickable(full.combi.mode) } }
	return { draft: over({ picks, note, rounds: rounds.map((round) => ({ ...round })), from: null }), warnings }
}

/** A draft of a saved entry, to edit it. Throws `CodeError` when its code no longer reads. */
export function draftFrom(entry: SavedCode): { draft: Draft; warnings: Issue[] } {
	const { draft, warnings } = draftFromCode(entry.code, entry.description, entry.rounds)
	return { draft: { ...draft, from: entry.code }, warnings }
}

export function codeOf(draft: Draft): string {
	return encodeFull(draft.full)
}

export function limitsFor(draft: Draft): EpisodeLimits {
	return limitsOf(draft.full.combi.episode)
}

/** The goals the draft's mode offers: all four by hand, no Score for an auto run. */
export function goalOptions(draft: Draft): readonly Goal[] {
	return goalsFor(draft.full.combi.mode)
}

/**
 * Whether an auto run needs a hand, and why; null for a manual run, which is
 * played by hand anyway. `describeBuild` without the wording.
 */
export function verdictOf(draft: Draft): BuildVerdict | null {
	const { combi } = draft.full
	if (combi.mode === "manual") return null
	const reasons: ReasonId[] = []
	if (combi.boosts.includes("fastStart")) reasons.push("fastStart")
	if (combi.randomBoost !== null) reasons.push("randomBoost")
	if (combi.action !== "none") reasons.push("action")
	if (carriesRelay(draft.full)) reasons.push("relay")
	return { semi: isSemiAutoBuild(draft.full), reasons }
}

/** A count as a badge, or nothing at all for none. */
function badge(count: number): string {
	return count === 0 ? "" : String(count)
}

/** What each editor tab holds, counted from the build; blank where it holds nothing or is off. */
export function tabBadges(draft: Draft): Record<TabName, string> {
	const { combi, loadout } = draft.full
	const limits = limitsFor(draft)
	const people = [loadout.cookie, loadout.relay, loadout.pet].filter((id) => id !== null).length
	const boosts = combi.boosts.length + (combi.randomBoost === null ? 0 : 1) + combi.cookiePowers.length
	return {
		main: "",
		cookies: badge(people),
		treasures: limits.treasures ? `${loadout.treasures.length}/${MAX_TREASURE_SLOTS}` : "",
		boosts: badge(boosts),
		runLog: "",
	}
}

/** Whether a tab has anything the episode lets a run carry. */
export function tabEnabled(draft: Draft, tab: TabName): boolean {
	const limits = limitsFor(draft)
	if (tab === "boosts") return limits.boosts
	if (tab === "treasures") return limits.treasures
	return true
}

/** Manual or auto; semi-auto is what the build makes of auto, so it lands on auto. */
export function setMode(draft: Draft, mode: Mode): Draft {
	return withCombi(draft, { mode: pickable(mode) })
}

/**
 * The goal set as the row now holds it, against the goals the row showed.
 * Score stands alone: a set that newly holds it is Score alone, and a set that
 * adds another goal beside it drops it. Only the goals the mode offers are
 * taken, and at least one stays, so a set with none of them changes nothing.
 */
export function setGoals(draft: Draft, picked: readonly Goal[]): Draft {
	const goals = goalOptions(draft).filter((goal) => picked.includes(goal))
	if (goals.length === 0) return draft
	const before = draft.full.combi.goals
	const solo = goals.includes(SOLO_GOAL)
	const others = goals.filter((goal) => goal !== SOLO_GOAL)
	let next: Goal[]
	if (!solo || others.length === 0) next = [...goals]
	else next = before.includes(SOLO_GOAL) ? others : [SOLO_GOAL]
	return withCombi(draft, { goals: next })
}

export function setEpisode(draft: Draft, episode: Episode): Draft {
	return withCombi(draft, { episode })
}

/** The tower's floor, 1 to 100 (above is the top floor), or null for any; below 1 is any. */
export function setFloor(draft: Draft, floor: number | null): Draft {
	const whole = floor === null ? Number.NaN : Math.trunc(floor)
	return withCombi(draft, { floor: Number.isNaN(whole) || whole < 1 ? null : Math.min(whole, FLOOR_MAX) })
}

/** The starting action, which only an auto run has. */
export function setAction(draft: Draft, action: Action): Draft {
	if (draft.picks.combi.mode === "manual") return draft
	return withCombi(draft, { action })
}

/** A catalog id, the Any id, or null to clear the role. */
export function setRole(draft: Draft, role: "cookie" | "relay" | "pet", id: string | null): Draft {
	return withLoadout(draft, { [role]: id })
}

/**
 * One of the three treasure slots the editor shows. An empty slot is no gap in
 * the code, so it drops out and the slots after it move up.
 */
export function setTreasureSlot(draft: Draft, index: number, picks: readonly TreasurePick[]): Draft {
	if (!Number.isInteger(index) || index < 0 || index >= MAX_TREASURE_SLOTS) return draft
	const slots = Array.from({ length: MAX_TREASURE_SLOTS }, (_, at) => draft.picks.loadout.treasures[at] ?? [])
	slots[index] = picks.map((pick) => ({ id: pick.id, levels: [...pick.levels] }))
	return withLoadout(draft, { treasures: slots.filter((slot) => slot.length > 0) })
}

export function setOrdered(draft: Draft, ordered: boolean): Draft {
	return withLoadout(draft, { ordered })
}

function toggled<T>(values: readonly T[], value: T): T[] {
	return values.includes(value) ? values.filter((held) => held !== value) : [...values, value]
}

export function toggleBoost(draft: Draft, boost: Boost): Draft {
	if (!ALL_BOOSTS.includes(boost)) return draft
	return withCombi(draft, { boosts: toggled(draft.picks.combi.boosts, boost) })
}

export function setRandomBoost(draft: Draft, randomBoost: RandomBoost | null): Draft {
	return withCombi(draft, { randomBoost })
}

export function toggleCookiePower(draft: Draft, power: CookiePower): Draft {
	if (!ALL_COOKIE_POWERS.includes(power)) return draft
	return withCombi(draft, { cookiePowers: toggled(draft.picks.combi.cookiePowers, power) })
}

export function setNote(draft: Draft, note: string): Draft {
	return { ...draft, note }
}

/** A blank round at the end of the Run log. */
export function addRound(draft: Draft): Draft {
	return { ...draft, rounds: [...draft.rounds, {}] }
}

/** One value of one round, or null to clear it; an index with no round changes nothing. */
export function setRoundValue(draft: Draft, index: number, field: StatField, value: number | null): Draft {
	const round = draft.rounds[index]
	if (round === undefined) return draft
	const next: RoundDraft = { ...round }
	if (value === null) delete next[field]
	else next[field] = value
	return { ...draft, rounds: draft.rounds.with(index, next) }
}

export function removeRound(draft: Draft, index: number): Draft {
	if (draft.rounds[index] === undefined) return draft
	return { ...draft, rounds: draft.rounds.filter((_, at) => at !== index) }
}

/** The rounds a save keeps: the ones with any value. */
export function keptRounds(draft: Draft): Round[] {
	return draft.rounds.filter((round) => !isEmptyRound(round))
}

/**
 * Whether the draft says something `saved` does not: its code, its note as it
 * would be kept, or its rounds as they would be kept. With no entry,
 * everything is unsaved.
 */
export function isDirty(draft: Draft, saved: SavedCode | null): boolean {
	if (saved === null) return true
	if (codeOf(draft) !== saved.code) return true
	if (cleanDescription(draft.note) !== saved.description) return true
	const mine = keptRounds(draft)
	const theirs = saved.rounds ?? []
	if (mine.length !== theirs.length) return true
	return mine.some((round, at) => STAT_FIELDS.some((field) => round[field] !== theirs[at]?.[field]))
}
