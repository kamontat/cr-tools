/**
 * What the saved list does with its entries: search, the goal filter, the sorts
 * and the small loadout icons a row shows. Pure over `SavedCode`s, so the page
 * only wires it; the only storage here is the sort someone last picked.
 *
 * An entry outlives the catalog and the format that wrote it, so every helper
 * that decodes one has an answer for a code that no longer reads.
 */

import type { Goal } from "./codec"
import type { SavedCode } from "./saved"

import { readKey, writeKey } from "#lib/storage"
import { imageFor, isAnyId, labelFor, nameFor } from "./catalog"
import { combiSectionOf, decodeFull } from "./full-code"

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

/** The midpoint of the money range an entry earned, or null when it has none. */
export function averageMoney(entry: SavedCode): number | null {
	const money = entry.stats?.money
	return money === undefined ? null : (money.min + money.max) / 2
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
