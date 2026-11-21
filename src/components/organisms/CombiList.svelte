<script lang="ts">
import type { SavedCode } from "#lib/combi/saved"

import { SvelteSet } from "svelte/reactivity"

import EntryIcon from "#components/atoms/EntryIcon.svelte"
import { ALL_GOALS } from "#lib/combi/codec"
import { describeCombi, episodeText } from "#lib/combi/describe"
import { combiSectionOf } from "#lib/combi/full-code"
import {
	filterList,
	type GoalFilter,
	type GoalTarget,
	goalTargets,
	LIST_SORTS,
	type ListSort,
	readListSort,
	rowEpisode,
	rowFull,
	rowGoals,
	rowLoadout,
	rowTeam,
	sortList,
	type TeamPiece,
	writeListSort,
} from "#lib/combi/list"
import { descriptionTitle } from "#lib/combi/saved"
import { STAT_FIELDS, type StatField, type StatRange } from "#lib/combi/stats"
import { messagesFor } from "#lib/i18n/messages"
import { currentLang, type Lang, LOCALES, onLangChange } from "#lib/lang"
import { localStore } from "#lib/storage"

interface Props {
	entries: SavedCode[]
	/** The code open in the editor, marked with `aria-current`. */
	current: string | null
	onnew: () => void
	onopen: (entry: SavedCode) => void
	oncopy: (entry: SavedCode) => void
	onshare: (entry: SavedCode) => void
	ondelete: (entry: SavedCode) => void
}

let { entries, current, onnew, onopen, oncopy, onshare, ondelete }: Props = $props()

let lang = $state<Lang>(currentLang(document))
const m = $derived(messagesFor(lang))

$effect(() => onLangChange(document, (next) => (lang = next)))

const store = localStore()

let query = $state("")
let goal = $state<GoalFilter>("all")
let sort = $state<ListSort>(readListSort(store))

const shown = $derived(sortList(filterList(entries, query, goal), sort))
const money = $derived(new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 0 }))
const date = $derived(new Intl.DateTimeFormat(LOCALES[lang], { day: "numeric", month: "short", year: "numeric" }))

/** The codes whose rows are open; any number at once. */
const expanded = new SvelteSet<string>()
/** The code whose Delete was pressed once and now asks to be pressed again. */
let arming = $state<string | null>(null)

const toggle = (code: string) => {
	if (expanded.has(code)) {
		expanded.delete(code)
		if (arming === code) arming = null
	} else expanded.add(code)
}

const rangeText = (range: StatRange): string =>
	range.min === range.max ? money.format(range.min) : `${money.format(range.min)}–${money.format(range.max)}`

/** What the saved runs reached for a goal, or null when they do not say. */
const targetOf = (goal: GoalTarget["goal"], targets: readonly GoalTarget[]): string | null => {
	const target = targets.find((t) => t.goal === goal)
	return target === undefined ? null : rangeText(target.range)
}

/** A piece's caption: its role, and for a treasure kept in order its slot. */
const roleText = (piece: TeamPiece): string => {
	const { fields } = m.combi.describe
	if (piece.role !== "treasure") return fields[piece.role]
	return piece.position === undefined ? fields.treasures : `${fields.treasures} ${piece.position}`
}

/** The run settings an open row lists: those set, beyond the goals and episode its head already shows. */
const settingsOf = (code: string) => {
	const decoded = rowFull(code)
	if (decoded === null) return []
	const { fields, none } = m.combi.describe
	return describeCombi(decoded.combi, m).rows.filter(
		(row) =>
			row.field !== fields.goal &&
			row.field !== fields.episode &&
			row.value !== none &&
			row.value !== m.combi.actions.none,
	)
}

/** The saved stats, the ones the code's goals aim for marked. */
const statsOf = (entry: SavedCode) => {
	const aimed = new Set<StatField>(goalTargets(entry).map((target) => target.field))
	return STAT_FIELDS.flatMap((field) => {
		const value = entry.stats?.[field]
		if (value === undefined) return []
		const text = typeof value === "number" ? money.format(value) : rangeText(value)
		return [{ field, label: m.combi.editor.statLabels[field], value: text, aimed: aimed.has(field) }]
	})
}

/** The first press asks; the second, on the same button, deletes. */
const remove = (entry: SavedCode) => {
	if (arming !== entry.code) {
		arming = entry.code
		return
	}
	arming = null
	expanded.delete(entry.code)
	ondelete(entry)
}

const pickGoal = (value: string) => {
	goal = (ALL_GOALS as readonly string[]).includes(value) ? (value as GoalFilter) : "all"
}

const pickSort = (value: string) => {
	sort = (LIST_SORTS as readonly string[]).includes(value) ? (value as ListSort) : "newest"
	writeListSort(sort, store)
}
</script>

<section class="list">
	<div class="tools">
		<button type="button" class="btn primary new" onclick={onnew}>
			<span aria-hidden="true">+</span> {m.combi.list.newCode}
		</button>
		<input
			class="search"
			type="search"
			aria-label={m.combi.list.search}
			placeholder={m.combi.list.search}
			bind:value={query}>
		<select
			aria-label={m.combi.list.columns.goal}
			value={goal}
			onchange={(event) => pickGoal(event.currentTarget.value)}>
			<option value="all">{m.combi.list.allGoals}</option>
			{#each ALL_GOALS as id (id)}
				<option value={id}>{m.combi.goals[id]}</option>
			{/each}
		</select>
		<select aria-label={m.combi.list.sortBy} value={sort} onchange={(event) => pickSort(event.currentTarget.value)}>
			{#each LIST_SORTS as id (id)}
				<option value={id}>{m.combi.list.sort[id]}</option>
			{/each}
		</select>
	</div>

	{#if entries.length === 0}
		<p class="empty">{m.combi.list.empty}</p>
	{:else if shown.length === 0}
		<p class="empty">{m.combi.list.noMatch}</p>
	{:else}
		<ul class="entries">
			{#each shown as entry, index (entry.code)}
				{@const game = combiSectionOf(entry.code)}
				{@const note = descriptionTitle(entry.description)}
				{@const targets = goalTargets(entry)}
				{@const episode = rowEpisode(entry.code)}
				{@const icons = rowLoadout(entry.code)}
				{@const open = expanded.has(entry.code)}
				{@const id = `entry-details-${index}`}
				{@const subline = [note, episode === null ? "" : episodeText(episode, m)].filter(Boolean).join(" · ")}
				<li class="entry" class:open aria-current={entry.code === current ? "true" : undefined}>
					<button
						type="button"
						class="head"
						aria-expanded={open}
						aria-controls={open ? id : undefined}
						onclick={() => toggle(entry.code)}>
						<span class="face" class:empty={!icons?.cookie}>
							{#if icons?.cookie}
								<EntryIcon src={icons.cookie.src} name={icons.cookie.name} size={44} />
							{/if}
							{#if icons?.pet}
								<span class="face-pet">
									<EntryIcon src={icons.pet.src} name={icons.pet.name} round size={26} />
								</span>
							{/if}
						</span>
						<span class="summary">
							<span class="line">
								<span class="code">{game}</span>
								<span class="goals">
									{#each rowGoals(entry.code) ?? [] as goal (goal)}
										{@const target = targetOf(goal, targets)}
										<span class="goal">
											{m.combi.goals[goal]}
											{#if target !== null}
												<strong>{target}</strong>
											{/if}
										</span>
									{/each}
								</span>
							</span>
							{#if subline}
								<span class="note">{subline}</span>
							{/if}
						</span>
						<span class="chevron" aria-hidden="true"></span>
					</button>
					{#if open}
						{@const team = rowTeam(entry.code) ?? []}
						{@const members = team.filter((piece) => piece.role !== "treasure")}
						{@const slots = team.filter((piece) => piece.role === "treasure")}
						{@const stats = statsOf(entry)}
						{@const settings = settingsOf(entry.code)}
						<div {id} class="details">
							<dl class="facts">
								{#if members.length > 0}
									<dt>{m.combi.list.team}</dt>
									<dd class="pieces">
										{#each members as piece, at (at)}
											{@const pick = piece.picks[0]}
											{#if pick}
												<span class="piece">
													<span class="chip" class:round={pick.icon.round}>
														<EntryIcon
															src={pick.icon.src}
															name={pick.icon.name}
															round={pick.icon.round ?? false}
															size={30} />
													</span>
													<span class="piece-text">
														<span class="name">{pick.icon.name}</span>
														<span class="role">{roleText(piece)}</span>
													</span>
												</span>
											{/if}
										{/each}
									</dd>
								{/if}
								{#if slots.length > 0}
									<dt>{m.combi.describe.fields.treasures}</dt>
									<dd class="pieces">
										{#each slots as piece, at (at)}
											<span class="piece">
												{#if piece.position !== undefined}
													<span class="position">{piece.position}</span>
												{/if}
												<span class="chip slot" class:many={piece.picks.length > 1}>
													{#each piece.picks as pick, n (n)}
														{#if n > 0}
															<span class="slash" aria-hidden="true">/</span>
														{/if}
														<EntryIcon
															src={pick.icon.src}
															name={pick.icon.name}
															round
															size={piece.picks.length > 1 ? 26 : 30} />
													{/each}
												</span>
												<span class="piece-text">
													{#each piece.picks as pick, n (n)}
														<span class={n === 0 ? "name" : "or"}>
															{#if n > 0}
																{m.combi.describe.orTreasure.trim()}
															{/if}
															{pick.icon.name}
															{#if pick.level}
																<span class="level">{pick.level}</span>
															{/if}
														</span>
													{/each}
												</span>
											</span>
										{/each}
									</dd>
								{/if}
								{#if stats.length > 0}
									<dt>{m.combi.list.results}</dt>
									<dd class="inline">
										{#each stats as stat (stat.field)}
											<span>
												{stat.label}
												<strong class:aimed={stat.aimed}>{stat.value}</strong>
											</span>
										{/each}
									</dd>
								{/if}
								{#if settings.length > 0}
									<dt>{m.combi.list.run}</dt>
									<dd class="inline">
										{#each settings as row (row.field)}
											<span>
												{#if row.field === m.combi.describe.fields.mode}
													<strong>{row.value}</strong>
												{:else}
													{row.field}
													<strong>{row.value}</strong>
												{/if}
											</span>
										{/each}
									</dd>
								{/if}
							</dl>
							<div class="foot">
								<span class="saved">{m.combi.list.saved(date.format(entry.savedAt))}</span>
								<div class="actions">
									{#if arming === entry.code}
										<button
											type="button"
											class="btn small danger armed"
											aria-label={m.combi.list.confirmDeleteCode(game)}
											onclick={() => remove(entry)}
											onblur={() => (arming = null)}>
											{m.combi.list.confirmDelete}
										</button>
									{:else}
										<button
											type="button"
											class="btn small danger"
											aria-label={m.combi.list.deleteCode(game)}
											onclick={() => remove(entry)}>
											{m.combi.list.delete}
										</button>
									{/if}
									<button
										type="button"
										class="btn small"
										aria-label={m.combi.list.shareCode(game)}
										onclick={() => onshare(entry)}>
										{m.combi.list.share}
									</button>
									<button
										type="button"
										class="btn small"
										aria-label={m.combi.list.copyCode(game)}
										onclick={() => oncopy(entry)}>
										{m.combi.list.copy}
									</button>
									<button
										type="button"
										class="btn small primary"
										aria-label={m.combi.list.editCode(game)}
										onclick={() => onopen(entry)}>
										{m.combi.list.edit}
									</button>
								</div>
							</div>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
.list {
	display: flex;
	flex-direction: column;
	gap: 14px;
	min-width: 0;
	/* The list sits beside the docked editor, so it reads its own width, not the window's. */
	container: list / inline-size;
}

/* A narrow list gives New code and search the width, and filter and sort share a row. */
.tools {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
	align-items: center;
}

.new,
.search {
	grid-column: 1 / -1;
}

@container list (min-width: 560px) {
	.tools {
		grid-template-columns: auto minmax(0, 1fr) auto auto;
	}

	.new,
	.search {
		grid-column: auto;
	}
}

.btn,
.search,
select {
	min-width: 0;
	min-height: 38px;
	padding: 7px 12px;
	border: 1px solid var(--line);
	border-radius: var(--radius);
	background: var(--surface);
	color: var(--text);
	font: inherit;
}

.btn {
	font-weight: 600;
	cursor: pointer;
}

/* The browser's own arrow ignores the padding and sits on the border; draw it inside instead. */
select {
	appearance: none;
	padding-inline-end: 34px;
	background-image:
		linear-gradient(45deg, transparent 50%, currentColor 50%),
		linear-gradient(135deg, currentColor 50%, transparent 50%);
	background-position:
		right 17px center,
		right 12px center;
	background-size: 5px 5px;
	background-repeat: no-repeat;
	cursor: pointer;
}

.btn.primary {
	border-color: var(--accent);
	background: var(--accent);
	color: var(--on-accent);
}

@media (pointer: coarse) {
	.btn,
	.search,
	select,
	.head {
		min-height: var(--tap);
	}
}

.empty {
	margin: 0;
	padding: 14px;
	border: 1px solid var(--line);
	border-radius: var(--radius-lg);
	background: var(--surface);
	color: var(--muted);
}

.entries {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	border: 1px solid var(--line);
	border-radius: var(--radius-lg);
	background: var(--surface);
	list-style: none;
	overflow: hidden;
}

.entry {
	border-bottom: 1px solid var(--line);
}

.entry:last-child {
	border-bottom: 0;
}

.entry[aria-current="true"] {
	box-shadow: inset 3px 0 0 var(--accent);
}

/* The head: the cookie with its pet on the corner, the code and goals, the note and episode, the chevron. */
.head {
	display: flex;
	gap: 14px;
	align-items: center;
	width: 100%;
	padding: 12px 16px;
	border: 0;
	background: none;
	color: var(--text);
	font: inherit;
	text-align: start;
	cursor: pointer;
}

.head:hover {
	background: var(--hover);
}

.head:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: -2px;
}

.face {
	position: relative;
	display: flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 52px;
	height: 52px;
	border-radius: 12px;
	background: var(--hover);
}

/* No cookie set: an empty slot, as the game draws one. */
.face.empty {
	border: 2px dashed var(--line);
	background: none;
}

.face-pet {
	position: absolute;
	right: -6px;
	bottom: -6px;
	display: flex;
	border-radius: 50%;
	background: var(--surface);
	box-shadow: 0 0 0 2px var(--surface);
}

.summary {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}

.line {
	display: flex;
	flex-flow: row wrap;
	gap: 4px 14px;
	align-items: baseline;
}

.code {
	color: var(--code);
	font-family: var(--mono);
	font-size: 1.125rem;
	font-weight: 700;
	letter-spacing: 0.08em;
}

.goals {
	display: flex;
	flex-flow: row wrap;
	gap: 4px 12px;
	color: var(--muted);
	font-size: 0.8125rem;
	font-variant-numeric: tabular-nums;
}

.goal strong {
	color: var(--text);
	font-weight: 600;
}

.note {
	overflow: hidden;
	color: var(--muted);
	font-size: 0.8125rem;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.chevron {
	flex: none;
	width: 8px;
	height: 8px;
	margin-inline: 4px;
	border-right: 2px solid var(--muted);
	border-bottom: 2px solid var(--muted);
	transform: translateY(-2px) rotate(45deg);
	transition: transform 0.15s;
}

.entry.open .chevron {
	transform: translateY(2px) rotate(225deg);
}

/* An open row: labelled lines (team, treasures, results, run), each shown with its icons, then the date and actions. */
.details {
	display: flex;
	flex-direction: column;
	gap: 12px;
	margin: 0 16px 14px;
	padding: 14px;
	border-radius: var(--radius-lg);
	background: var(--bg);
	font-size: 0.8125rem;
}

.facts {
	display: grid;
	grid-template-columns: 76px minmax(0, 1fr);
	gap: 14px 12px;
	align-items: start;
	margin: 0;
}

.facts dt {
	color: var(--muted);
}

.facts dd {
	min-width: 0;
	margin: 0;
}

.facts dt:has(+ .pieces) {
	padding-top: 9px;
}

.pieces {
	display: flex;
	flex-flow: row wrap;
	gap: 10px 18px;
}

.piece {
	display: flex;
	gap: 8px;
	align-items: flex-start;
	min-width: 0;
}

.chip {
	display: flex;
	flex: none;
	gap: 1px;
	align-items: center;
	justify-content: center;
	min-width: 36px;
	height: 36px;
	border-radius: 10px;
	background: var(--surface);
}

.chip.round {
	border-radius: 50%;
}

.chip.slot {
	padding: 0 3px;
	border-radius: 18px;
}

.chip.slot.many {
	padding: 0 8px;
}

.slash {
	margin: 0 1px;
	color: var(--muted);
	font-size: 0.625rem;
}

.position {
	padding-top: 10px;
	color: var(--muted);
	font-size: 0.75rem;
	font-variant-numeric: tabular-nums;
}

.piece-text {
	display: flex;
	flex-direction: column;
	min-width: 0;
	padding-top: 1px;
	line-height: 1.3;
}

.name {
	font-weight: 600;
	overflow-wrap: anywhere;
}

.role,
.or {
	color: var(--muted);
	font-size: 0.75rem;
	overflow-wrap: anywhere;
}

.level {
	margin-inline-start: 4px;
	color: var(--muted);
	font-weight: 400;
	font-variant-numeric: tabular-nums;
}

.inline {
	display: flex;
	flex-flow: row wrap;
	gap: 4px 16px;
	color: var(--muted);
}

.inline strong {
	color: var(--text);
	font-weight: 600;
	font-variant-numeric: tabular-nums;
}

.inline strong.aimed {
	color: var(--accent);
}

.foot {
	display: flex;
	flex-flow: row wrap;
	gap: 8px 12px;
	align-items: center;
	justify-content: space-between;
	padding-top: 10px;
	border-top: 1px solid var(--line);
}

.saved {
	color: var(--muted);
	font-size: 0.75rem;
}

.actions {
	display: flex;
	flex-flow: row wrap;
	gap: 6px;
}

.btn.small {
	min-height: 32px;
	padding: 4px 12px;
	font-size: 0.8125rem;
}

.btn.danger {
	border-color: transparent;
	background: none;
	color: var(--danger);
}

.btn.danger:hover {
	background: var(--hover);
}

.btn.danger.armed {
	border-color: var(--danger);
	background: var(--danger);
	color: #fff;
}

/* A narrow list puts each label over its line. */
@container list (max-width: 480px) {
	.head {
		padding-inline: 12px;
	}

	.details {
		margin-inline: 10px;
	}

	.facts {
		grid-template-columns: minmax(0, 1fr);
		gap: 4px;
	}

	.facts dd + dt {
		margin-top: 10px;
	}

	.facts dt:has(+ .pieces) {
		padding-top: 0;
	}
}
</style>
