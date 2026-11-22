import type { Messages } from "#lib/i18n/messages"

import { type CatalogSection, isRetired, labelFor } from "./catalog"
import { ALL_GOALS, type Combi, type Episode, type Goal, isSemiAuto, limitsOf } from "./codec"
import { carriesRelay, type FullCode, isSemiAutoBuild } from "./full-code"
import { BOOST_LABELS, COOKIE_POWER_LABELS, EPISODE_LABELS, RANDOM_BOOST_LABELS } from "./labels"
import { type Loadout, levelRuns, type TreasurePick } from "./loadout"

export type DescribedRow = {
	field: string
	value: string
}

export type AutoVerdict = {
	semi: boolean
	/** What forces manual work each run. Empty when the combi is full auto. */
	reasons: string[]
}

export type DescribedCombi = {
	rows: DescribedRow[]
	/** Null for a manual run, where auto vs semi-auto means nothing. */
	auto: AutoVerdict | null
}

/**
 * The goals a run aims for, in table order, or Any naming its field — a bare
 * "Any" beside a mode and an episode reads as nothing. A reader that splits
 * them splits on `m.combi.describe.goalsJoin`.
 */
export function goalsText(goals: readonly Goal[], m: Messages): string {
	return goals.length === 0
		? m.combi.describe.anyGoal
		: ALL_GOALS.filter((goal) => goals.includes(goal))
				.map((goal) => m.combi.goals[goal])
				.join(m.combi.describe.goalsJoin)
}

function list(values: string[], m: Messages): string {
	return values.length === 0 ? m.combi.describe.none : values.join(", ")
}

function verdict(combi: Combi, m: Messages): AutoVerdict | null {
	if (combi.mode === "manual") return null

	const reasons: string[] = []
	if (combi.boosts.includes("fastStart")) reasons.push(BOOST_LABELS.fastStart)
	if (combi.randomBoost !== null) {
		reasons.push(RANDOM_BOOST_LABELS[combi.randomBoost])
	}
	if (combi.action !== "none") reasons.push(m.combi.actions[combi.action])

	return { semi: isSemiAuto(combi), reasons }
}

/**
 * The verdict for a whole build rather than for its ten characters: the combi's
 * own three reasons plus the loadout's one. A relay cookie is swapped in by
 * hand, so a run carrying one never plays itself through.
 */
export function describeBuild(full: FullCode, m: Messages): AutoVerdict | null {
	const own = verdict(full.combi, m)
	if (own === null) return null

	return {
		semi: isSemiAutoBuild(full),
		reasons: carriesRelay(full) ? [...own.reasons, m.combi.describe.relayCookie] : own.reasons,
	}
}

/**
 * An episode as a chip says it: "EP. 3", "S.EP. 2", "S.EP. Exp". Cut from the
 * label rather than kept as a second table, so a new episode needs no entry.
 */
function shortEpisode(episode: Episode): string {
	const label = EPISODE_LABELS[episode]
	if (!label.startsWith("Special ")) return label.replace(/^Episode/, "EP.")
	return `S.EP. ${label.replace(/^Special |Episode/g, "").trim()}`
}

/**
 * A build in a few words — mode, goal, episode, and the tower's floor — for a
 * saved row, where the note says what it is for and this says what it plays.
 * The mode is the build's, so a relay makes it Semi-auto; Any names its field,
 * since a bare "Any" beside two others reads as nothing.
 */
export function describeRun(full: FullCode, m: Messages): string[] {
	const { combi } = full
	const mode =
		combi.mode !== "manual" && isSemiAutoBuild(full)
			? m.combi.modes.semiauto
			: m.combi.modes[combi.mode === "semiauto" ? "auto" : combi.mode]
	return [
		mode,
		goalsText(combi.goals, m),
		combi.episode === "any" ? m.combi.describe.anyEpisode : shortEpisode(combi.episode),
		...(limitsOf(combi.episode).floor ? [floorText(combi.floor, m)] : []),
	]
}

/** An episode by name, or "any episode" in the catalogue's words: Any is the interface's word, not an episode's name. */
export function episodeText(episode: Episode, m: Messages): string {
	return episode === "any" ? m.combi.describe.anyEpisode : EPISODE_LABELS[episode]
}

/** The floor as a reader says it: a number, or any floor at all. */
export function floorText(floor: number | null, m: Messages): string {
	return floor === null ? m.combi.describe.anyFloor : m.combi.describe.floor(floor)
}

export function describeCombi(combi: Combi, m: Messages): DescribedCombi {
	const { describe: text } = m.combi
	const { fields } = text
	const limits = limitsOf(combi.episode)
	const carried: DescribedRow[] = limits.boosts
		? [
				{
					field: fields.boosts,
					value: list(
						combi.boosts.map((boost) => BOOST_LABELS[boost]),
						m,
					),
				},
				{
					field: fields.randomBoost,
					value: combi.randomBoost === null ? text.none : RANDOM_BOOST_LABELS[combi.randomBoost],
				},
				{
					field: fields.cookiePower,
					value: list(
						combi.cookiePowers.map((power) => COOKIE_POWER_LABELS[power]),
						m,
					),
				},
			]
		: [{ field: fields.boosts, value: text.notUsed }]

	return {
		rows: [
			{ field: fields.goal, value: goalsText(combi.goals, m) },
			{ field: fields.mode, value: m.combi.modes[combi.mode] },
			{ field: fields.episode, value: episodeText(combi.episode, m) },
			...(limits.floor ? [{ field: fields.floor, value: floorText(combi.floor, m) }] : []),
			...carried,
			{ field: fields.action, value: m.combi.actions[combi.action] },
		],
		auto: verdict(combi, m),
	}
}

/**
 * A code stays readable after the site drops an entry, so the entry is still
 * named — with a note, because the reader will not find it in the game.
 */
function entryName(section: CatalogSection, id: string, m: Messages): string {
	const name = labelFor(section, id)
	return isRetired(section, id) ? m.combi.describe.retired(name) : name
}

/** A treasure's accepted levels, runs joined by commas: `+0-2, +9`. */
export function levelText({ levels }: TreasurePick): string {
	return levelRuns(levels)
		.map(([min, max]) => (min === max ? `+${min}` : `+${min}-${max}`))
		.join(", ")
}

function slotName(slot: TreasurePick[], m: Messages): string {
	return slot
		.map((pick) => `${entryName("treasures", pick.id, m)} ${levelText(pick)}`)
		.join(m.combi.describe.orTreasure)
}

function treasureRow(loadout: Loadout, m: Messages): DescribedRow {
	const { fields, none } = m.combi.describe
	const { treasures, ordered } = loadout
	if (treasures.length === 0) return { field: fields.treasures, value: none }

	if (ordered && treasures.length > 1) {
		return {
			field: fields.treasuresOrdered,
			value: treasures.map((slot, position) => `${position + 1}. ${slotName(slot, m)}`).join("; "),
		}
	}

	return {
		field: fields.treasures,
		value: treasures.map((slot) => slotName(slot, m)).join("; "),
	}
}

export function describeLoadout(loadout: Loadout, m: Messages): DescribedRow[] {
	const { fields, none } = m.combi.describe
	const single = (field: string, section: CatalogSection, id: string | null): DescribedRow => ({
		field,
		value: id === null ? none : entryName(section, id, m),
	})

	return [
		single(fields.cookie, "cookies", loadout.cookie),
		single(fields.relay, "cookies", loadout.relay),
		single(fields.pet, "pets", loadout.pet),
		treasureRow(loadout, m),
	]
}
