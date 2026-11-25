/**
 * What the saved list does with its entries: search, the filters (goal, mode,
 * episode, cookie, rounds) and their counts, the sorts and their orders, and
 * what a row shows. Pure over `SavedCode`s, so the page
 * only wires it; the only storage here is the sort someone last picked.
 *
 * An entry outlives the catalog and the format that wrote it, so every helper
 * that decodes one has an answer for a code that no longer reads.
 */

import type { Boost, CookiePower, Episode, Goal, Mode, RandomBoost } from "./codec"
import type { FullCode } from "./full-code"
import type { SavedCode } from "./saved"

import { readKey, writeKey } from "#lib/storage"
import { boostArt, cookiePowerArt } from "./art"
import { type EntryKind, imageFor, isAnyId, kindFor, labelFor, nameFor } from "./catalog"
import { ALL_EPISODES, ALL_GOALS, limitsOf } from "./codec"
import { levelText } from "./describe"
import { combiSectionOf, decodeFull } from "./full-code"
import { averageOf } from "./rounds"
import { STAT_FIELDS, type StatField } from "./stats"

/** What the list can sort by. Each has its natural order, which `reverse` flips. */
export const SORT_KEYS = ["saved", "goal", "score", "money", "exp", "boxes", "time", "rounds", "code"] as const
export type SortKey = (typeof SORT_KEYS)[number]
export type ListSort = { key: SortKey; reverse: boolean }

export const DEFAULT_SORT: ListSort = { key: "saved", reverse: false }

export const LIST_SORT_KEY = "combi-name:list-sort"

/** The sorts before there were orders, as their new ones. */
const OLD_SORTS: Readonly<Record<string, ListSort>> = {
	newest: { key: "saved", reverse: false },
	oldest: { key: "saved", reverse: true },
}

/** The sort is stored as its key, with `:reverse` after it when reversed. */
export function readListSort(store: Storage | null): ListSort {
	const value = readKey(LIST_SORT_KEY, store)
	if (value === null) return DEFAULT_SORT
	const old = OLD_SORTS[value]
	if (old !== undefined) return old
	const [key, order, ...rest] = value.split(":")
	if (!(SORT_KEYS as readonly (string | undefined)[]).includes(key) || rest.length > 0) return DEFAULT_SORT
	if (order !== undefined && order !== "reverse") return DEFAULT_SORT
	return { key: key as SortKey, reverse: order === "reverse" }
}

export function writeListSort(sort: ListSort, store: Storage | null): void {
	writeKey(LIST_SORT_KEY, sort.reverse ? `${sort.key}:reverse` : sort.key, store)
}

/** The money an entry's rounds earned on average, or null when no round noted any. */
export function averageMoney(entry: SavedCode): number | null {
	return averageOf(entry.rounds ?? []).money ?? null
}

/** How many rounds an entry keeps. */
export function roundCount(entry: SavedCode): number {
	return entry.rounds?.length ?? 0
}

function compareText(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0
}

/** The stat each stat sort reads. */
const SORT_STATS: Partial<Record<SortKey, StatField>> = {
	score: "score",
	money: "money",
	exp: "exp",
	boxes: "boxes",
	time: "time",
}

/** The number a sort ranks an entry by, or null when the entry has none: those go last in either order. */
function rankOf(entry: SavedCode, key: SortKey): number | null {
	switch (key) {
		case "saved":
			return entry.savedAt
		case "rounds":
			return roundCount(entry)
		case "goal": {
			const goal = rowGoals(entry.code)?.[0]
			return goal === undefined ? null : (averageOf(entry.rounds ?? [])[GOAL_STATS[goal]] ?? null)
		}
		default: {
			const stat = SORT_STATS[key]
			return stat === undefined ? null : (averageOf(entry.rounds ?? [])[stat] ?? null)
		}
	}
}

/** Where "its goal" puts an entry's group: its first goal's place in `ALL_GOALS`, a code that does not read after all. */
function goalGroup(entry: SavedCode): number {
	const goal = rowGoals(entry.code)?.[0]
	return goal === undefined ? ALL_GOALS.length : ALL_GOALS.indexOf(goal)
}

/**
 * The list in a sort's order. Date saved, a stat and rounds put the most first, except
 * time, which puts the shortest first; code reads A–Z. `reverse` flips that, but an
 * entry with nothing to rank by stays last either way. "Its goal" groups the entries by
 * their first goal, in goal order, and ranks each group by that goal's average.
 */
export function sortList(entries: readonly SavedCode[], sort: ListSort): SavedCode[] {
	const list = [...entries]
	const { key, reverse } = sort
	if (key === "code") {
		list.sort((a, b) => compareText(combiSectionOf(a.code), combiSectionOf(b.code)) || compareText(a.code, b.code))
		return reverse ? list.reverse() : list
	}
	const ascending = (key === "time") !== reverse
	return list.sort((a, b) => {
		if (key === "goal") {
			const group = goalGroup(a) - goalGroup(b)
			if (group !== 0) return group
		}
		const x = rankOf(a, key)
		const y = rankOf(b, key)
		if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1
		return ascending ? x - y : y - x
	})
}

export type RoundsFilter = "any" | "with" | "without"

/** What the list is narrowed to. An empty set, `any` mode or `any` rounds narrows nothing. */
export type ListFilter = {
	/** Codes aiming for any of these. */
	goals: readonly Goal[]
	mode: Mode | "any"
	/** Codes for any of these episodes. */
	episodes: readonly Episode[]
	/** Codes whose cookie is any of these catalog ids. */
	cookies: readonly string[]
	rounds: RoundsFilter
}

export const NO_FILTER: ListFilter = { goals: [], mode: "any", episodes: [], cookies: [], rounds: "any" }

/** How many picks a filter holds: one per goal, episode and cookie, one each for mode and rounds. */
export function activeFilters(filter: ListFilter): number {
	return (
		filter.goals.length +
		(filter.mode === "any" ? 0 : 1) +
		filter.episodes.length +
		filter.cookies.length +
		(filter.rounds === "any" ? 0 : 1)
	)
}

type Decoded = ReturnType<typeof decodeFull>["full"] | null

/**
 * Codes already decoded. A code always decodes the same way, and search, the
 * goal filter, the goals column and the icons all ask on every keystroke, so
 * each decodes once. Callers must not change what they get.
 */
const decodedCodes = new Map<string, Decoded>()
const DECODED_LIMIT = 2000

function decoded(code: string): Decoded {
	const known = decodedCodes.get(code)
	if (known !== undefined || decodedCodes.has(code)) return known ?? null
	let full: Decoded
	try {
		full = decodeFull(code).full
	} catch {
		full = null
	}
	if (decodedCodes.size >= DECODED_LIMIT) decodedCodes.clear()
	decodedCodes.set(code, full)
	return full
}

/** The search's words, lower case. */
const wordsOf = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean)

function matchesQuery(entry: SavedCode, full: Decoded, words: readonly string[]): boolean {
	if (words.length === 0) return true
	const { cookie, pet } = full?.loadout ?? {}
	const haystack = [
		entry.code,
		cookie ? nameFor("cookies", cookie) : "",
		pet ? nameFor("pets", pet) : "",
		entry.description,
	]
		.join("\n")
		.toLowerCase()
	return words.every((word) => haystack.includes(word))
}

export type Facet = "goals" | "episodes" | "cookies"

/** Whether an entry passes every filter but `skip`. A code that does not read passes only filters that ask nothing of its code. */
function matchesFilter(entry: SavedCode, full: Decoded, filter: ListFilter, skip?: Facet): boolean {
	if (skip !== "goals" && filter.goals.length > 0 && !full?.combi.goals.some((goal) => filter.goals.includes(goal)))
		return false
	if (filter.mode !== "any" && full?.combi.mode !== filter.mode) return false
	if (skip !== "episodes" && filter.episodes.length > 0 && !(full && filter.episodes.includes(full.combi.episode)))
		return false
	if (skip !== "cookies" && filter.cookies.length > 0) {
		const cookie = full?.loadout.cookie
		if (cookie == null || !filter.cookies.includes(cookie)) return false
	}
	if (filter.rounds === "with" && roundCount(entry) === 0) return false
	if (filter.rounds === "without" && roundCount(entry) > 0) return false
	return true
}

/** The entries the search and the filter keep: every word of the search, and every filter. */
export function filterList(entries: readonly SavedCode[], query: string, filter: ListFilter): SavedCode[] {
	const words = wordsOf(query)
	return entries.filter((entry) => {
		const full = decoded(entry.code)
		return matchesFilter(entry, full, filter) && matchesQuery(entry, full, words)
	})
}

/**
 * How many entries picking `value` in `facet` would show alongside what is already
 * picked: the search and every other filter apply, the facet's own picks do not.
 */
export function facetCount(
	entries: readonly SavedCode[],
	query: string,
	filter: ListFilter,
	facet: Facet,
	value: string,
): number {
	const words = wordsOf(query)
	return entries.filter((entry) => {
		const full = decoded(entry.code)
		if (full === null || !matchesFilter(entry, full, filter, facet) || !matchesQuery(entry, full, words)) return false
		if (facet === "goals") return full.combi.goals.includes(value as Goal)
		if (facet === "episodes") return full.combi.episode === value
		return full.loadout.cookie === value
	}).length
}

/** What the episode and cookie filters offer: what the saved codes use, episodes in table order, cookies most used first. */
export function filterOptions(entries: readonly SavedCode[]): { episodes: Episode[]; cookies: string[] } {
	const episodes = new Set<Episode>()
	const cookies = new Map<string, number>()
	for (const entry of entries) {
		const full = decoded(entry.code)
		if (full === null) continue
		episodes.add(full.combi.episode)
		const { cookie } = full.loadout
		if (cookie !== null) cookies.set(cookie, (cookies.get(cookie) ?? 0) + 1)
	}
	return {
		episodes: ALL_EPISODES.filter((episode) => episodes.has(episode)),
		cookies: [...cookies.entries()]
			.sort(([a, x], [b, y]) => y - x || compareText(labelFor("cookies", a), labelFor("cookies", b)))
			.map(([id]) => id),
	}
}

/** The goals a code aims for, or null when the code does not decode. */
export function rowGoals(code: string): Goal[] | null {
	return decoded(code)?.combi.goals ?? null
}

/** The episode a code runs, or null when the code does not decode. */
export function rowEpisode(code: string): Episode | null {
	return decoded(code)?.combi.episode ?? null
}

/** The whole decoded code, for a row's details; null when the code does not decode. Do not change it. */
export function rowFull(code: string): FullCode | null {
	return decoded(code)
}

export type TeamPiece = {
	role: "cookie" | "relay" | "pet" | "treasure"
	/** The slot's place when the code keeps the treasures in order, from 1. */
	position?: number
	/**
	 * What the piece accepts: one entry, or for a treasure slot each treasure it
	 * takes, with its levels and its kind: base, evolved or blessed.
	 */
	picks: { icon: RowIcon; level?: string; kind?: EntryKind }[]
}

/** The team an open row shows, set pieces only, in play order; null when the code does not decode. */
export function rowTeam(code: string): TeamPiece[] | null {
	const full = decoded(code)
	if (full === null) return null
	const { cookie, relay, pet, treasures, ordered } = full.loadout
	const team: TeamPiece[] = []
	if (cookie !== null) team.push({ role: "cookie", picks: [{ icon: iconFor("cookies", cookie) }] })
	if (relay !== null) team.push({ role: "relay", picks: [{ icon: iconFor("cookies", relay) }] })
	if (pet !== null) team.push({ role: "pet", picks: [{ icon: { ...iconFor("pets", pet), round: true } }] })
	const numbered = ordered && treasures.length > 1
	treasures.forEach((slot, index) => {
		const picks = slot.map((pick) => {
			const kind = kindFor("treasures", pick.id)
			const icon = iconFor("treasures", pick.id)
			const level = levelText(pick)
			return kind === null ? { icon, level } : { icon, level, kind }
		})
		team.push(numbered ? { role: "treasure", position: index + 1, picks } : { role: "treasure", picks })
	})
	return team
}

export type RowBoosts = {
	/** Whether the code's episode takes boosts at all. */
	used: boolean
	boosts: { id: Boost; src: string | null }[]
	random: RandomBoost | null
	/** Each cookie power+, with the faces of the cookies and pets that bring it. */
	powers: { id: CookiePower; srcs: readonly string[] }[]
}

/** What an open row's Boosts line shows; null when the code does not decode. */
export function rowBoosts(code: string): RowBoosts | null {
	const full = decoded(code)
	if (full === null) return null
	const { episode, boosts, randomBoost, cookiePowers } = full.combi
	return {
		used: limitsOf(episode).boosts,
		boosts: boosts.map((id) => ({ id, src: boostArt(id, "/assets/")[0] ?? null })),
		random: randomBoost,
		powers: cookiePowers.map((id) => ({ id, srcs: cookiePowerArt(id, "/assets/") })),
	}
}

/** The run stat that measures each goal. */
const GOAL_STATS: Readonly<Record<Goal, Exclude<StatField, "time">>> = {
	score: "score",
	money: "money",
	exp: "exp",
	box: "boxes",
}

export type RowStat = { field: StatField; value: number | null }

/**
 * What a row measures: the average the entry's rounds reached for each goal its code
 * aims for, in the code's goal order, then time. Each is listed whether or not a round
 * noted it, so a row always shows the same stats for the same goals. With `all`, every
 * other stat a round noted comes between the goals' and time, in `STAT_FIELDS` order.
 */
export function rowStats(entry: SavedCode, all = false): RowStat[] {
	const average = averageOf(entry.rounds ?? [])
	const goals = (rowGoals(entry.code) ?? []).map((goal) => GOAL_STATS[goal])
	const others = all
		? STAT_FIELDS.filter((field) => field !== "time" && !goals.includes(field) && average[field] !== undefined)
		: []
	const fields: StatField[] = [...goals, ...others, "time"]
	return fields.map((field) => ({ field, value: average[field] ?? null }))
}

export type RowIcon = { src: string | null; name: string; round?: true; more?: number }
export type RowLoadout = { cookie: RowIcon | null; pet: RowIcon | null; treasures: RowIcon[] }

function iconFor(section: "cookies" | "pets" | "treasures", id: string): RowIcon {
	const image = isAnyId(section, id) ? null : imageFor(section, id)
	return { src: image === null ? null : `/assets/${image}`, name: labelFor(section, id) }
}

/** The icons a row shows for a code, or null when the code does not decode. */
export function rowLoadout(code: string): RowLoadout | null {
	const full = decoded(code)
	if (full === null) return null
	const { cookie, pet, treasures } = full.loadout
	return {
		cookie: cookie === null ? null : iconFor("cookies", cookie),
		pet: pet === null ? null : { ...iconFor("pets", pet), round: true },
		treasures: treasures.flatMap((slot) => {
			const first = slot[0]
			if (first === undefined) return []
			const icon = iconFor("treasures", first.id)
			return [slot.length > 1 ? { ...icon, more: slot.length - 1 } : icon]
		}),
	}
}
