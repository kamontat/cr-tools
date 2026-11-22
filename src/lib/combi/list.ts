/**
 * What the saved list does with its entries: search, the goal filter, the sorts
 * and the small loadout icons a row shows. Pure over `SavedCode`s, so the page
 * only wires it; the only storage here is the sort someone last picked.
 *
 * An entry outlives the catalog and the format that wrote it, so every helper
 * that decodes one has an answer for a code that no longer reads.
 */

import type { Boost, CookiePower, Episode, Goal, RandomBoost } from "./codec"
import type { FullCode } from "./full-code"
import type { SavedCode } from "./saved"
import type { StatField } from "./stats"

import { readKey, writeKey } from "#lib/storage"
import { boostArt, cookiePowerArt } from "./art"
import { type EntryKind, imageFor, isAnyId, kindFor, labelFor, nameFor } from "./catalog"
import { limitsOf } from "./codec"
import { levelText } from "./describe"
import { combiSectionOf, decodeFull } from "./full-code"
import { averageOf } from "./rounds"

export const LIST_SORTS = ["newest", "oldest", "money", "code"] as const
export type ListSort = (typeof LIST_SORTS)[number]

export const LIST_SORT_KEY = "combi-name:list-sort"

export function readListSort(store: Storage | null): ListSort {
	const value = readKey(LIST_SORT_KEY, store)
	return (LIST_SORTS as readonly (string | null)[]).includes(value) ? (value as ListSort) : "newest"
}

export function writeListSort(sort: ListSort, store: Storage | null): void {
	writeKey(LIST_SORT_KEY, sort, store)
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

export function sortList(entries: readonly SavedCode[], sort: ListSort): SavedCode[] {
	const list = [...entries]
	switch (sort) {
		case "newest":
			return list.sort((a, b) => b.savedAt - a.savedAt)
		case "oldest":
			return list.sort((a, b) => a.savedAt - b.savedAt)
		case "money":
			return list.sort((a, b) => {
				const x = averageMoney(a)
				const y = averageMoney(b)
				if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1
				return y - x
			})
		case "code":
			return list.sort(
				(a, b) => compareText(combiSectionOf(a.code), combiSectionOf(b.code)) || compareText(a.code, b.code),
			)
	}
}

export type GoalFilter = Goal | "all"

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

export function filterList(entries: readonly SavedCode[], query: string, goal: GoalFilter): SavedCode[] {
	const words = query.toLowerCase().split(/\s+/).filter(Boolean)
	return entries.filter((entry) => {
		const full = decoded(entry.code)
		if (goal !== "all" && !full?.combi.goals.includes(goal)) return false
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
	})
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
	 * takes, with its levels and, for an evolved or blessed one, its kind.
	 */
	picks: { icon: RowIcon; level?: string; mark?: Exclude<EntryKind, "base"> }[]
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
			return kind === null || kind === "base" ? { icon, level } : { icon, level, mark: kind }
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

export type GoalTarget = { goal: Goal; field: Exclude<StatField, "time">; value: number }

/** The average the entry's rounds reached for each goal its code aims for, in the code's goal order; goals no round noted are left out. */
export function goalTargets(entry: SavedCode): GoalTarget[] {
	const average = averageOf(entry.rounds ?? [])
	return (rowGoals(entry.code) ?? []).flatMap((goal) => {
		const field = GOAL_STATS[goal]
		const value = average[field]
		return value === undefined ? [] : [{ goal, field, value }]
	})
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
