<script lang="ts">
import type { SavedCode } from "#lib/combi/saved"

import LoadoutIcons from "#components/molecules/LoadoutIcons.svelte"
import { ALL_GOALS } from "#lib/combi/codec"
import { goalsText } from "#lib/combi/describe"
import { combiSectionOf } from "#lib/combi/full-code"
import {
	averageMoney,
	filterList,
	type GoalFilter,
	LIST_SORTS,
	type ListSort,
	readListSort,
	rowGoals,
	rowLoadout,
	sortList,
	writeListSort,
} from "#lib/combi/list"
import { descriptionTitle } from "#lib/combi/saved"
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
}

let { entries, current, onnew, onopen, oncopy, onshare }: Props = $props()

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

const goalsOf = (code: string): string => {
	const goals = rowGoals(code)
	return goals === null ? "" : goalsText(goals, m)
}

const pickGoal = (value: string) => {
	goal = (ALL_GOALS as readonly string[]).includes(value) ? (value as GoalFilter) : "all"
}

const pickSort = (value: string) => {
	sort = (LIST_SORTS as readonly string[]).includes(value) ? (value as ListSort) : "newest"
	writeListSort(sort, store)
}

/** Copy and Share act on the row's entry without opening it. */
const act = (event: MouseEvent, run: (entry: SavedCode) => void, entry: SavedCode) => {
	event.stopPropagation()
	run(entry)
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
		<table>
			<thead>
				<tr>
					<th scope="col">{m.combi.list.columns.code}</th>
					<th scope="col">{m.combi.list.columns.loadout}</th>
					<th scope="col">{m.combi.list.columns.note}</th>
					<th scope="col">{m.combi.list.columns.goal}</th>
					<th scope="col" class="num">{m.combi.list.columns.money}</th>
					<th scope="col">{m.combi.list.columns.saved}</th>
					<td></td>
				</tr>
			</thead>
			<tbody>
				{#each shown as entry (entry.code)}
					{@const game = combiSectionOf(entry.code)}
					{@const note = descriptionTitle(entry.description)}
					{@const goals = goalsOf(entry.code)}
					{@const average = averageMoney(entry)}
					<!-- The code is the row's button, for the keyboard; a click anywhere else on the row is a pointer's shortcut to it. -->
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
					<tr aria-current={entry.code === current ? "true" : undefined} onclick={() => onopen(entry)}>
						<td class="code"><button type="button" class="open">{game}</button></td>
						<td class="loadout"><LoadoutIcons loadout={rowLoadout(entry.code)} size={26} /></td>
						<td class="note">
							<span class="narrow">{note || goals}</span>
							<span class="wide">{note || "–"}</span>
						</td>
						<td class="goal wide-cell">{goals || "–"}</td>
						<td class="num money" class:none={average === null}>
							{#if average !== null}
								<span class="narrow">{m.combi.list.average}</span>
								{money.format(average)}
							{:else}
								<span class="wide">–</span>
							{/if}
						</td>
						<td class="saved wide-cell">{date.format(entry.savedAt)}</td>
						<td class="actions">
							<button
								type="button"
								class="icon"
								aria-label={m.combi.list.shareCode(game)}
								title={m.combi.list.share}
								onclick={(event) => act(event, onshare, entry)}>
								↗
							</button>
							<button
								type="button"
								class="copy"
								aria-label={m.combi.list.copyCode(game)}
								onclick={(event) => act(event, oncopy, entry)}>
								{m.combi.list.copy}
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<style>
.list {
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

.btn.primary {
	border-color: var(--accent);
	background: var(--accent);
	color: var(--on-accent);
}

@media (pointer: coarse) {
	.btn,
	.search,
	select,
	.actions button {
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

table {
	width: 100%;
	border-collapse: separate;
	border-spacing: 0;
	border: 1px solid var(--line);
	border-radius: var(--radius-lg);
	background: var(--surface);
	overflow: hidden;
}

/* A list narrower than the table needs shows each row as a card: code, icons, note and money on the left, the actions on the right. */
thead {
	display: none;
}

table,
tbody {
	display: block;
}

tbody tr {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	column-gap: 12px;
	row-gap: 4px;
	align-items: center;
	padding: 12px 14px;
	border-bottom: 1px solid var(--line);
	cursor: pointer;
}

tbody tr:last-child {
	border-bottom: 0;
}

tbody tr:hover {
	background: var(--hover);
}

tbody tr[aria-current="true"] {
	background: var(--hover);
	box-shadow: inset 3px 0 0 var(--accent);
}

td {
	display: block;
	grid-column: 1;
	min-width: 0;
	padding: 0;
}

td.actions {
	grid-column: 2;
	grid-row: 1 / span 4;
}

.wide,
.wide-cell,
td.none {
	display: none;
}

.note,
.money {
	color: var(--muted);
	font-size: 0.8125rem;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.num {
	font-variant-numeric: tabular-nums;
}

.code .open {
	padding: 0;
	border: 0;
	border-radius: 4px;
	background: none;
	color: var(--code);
	font-family: var(--mono);
	font-size: 1.0625rem;
	font-weight: 600;
	letter-spacing: 0.08em;
	cursor: pointer;
}

.code .open:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}

.actions {
	display: flex;
	gap: 2px;
	justify-content: flex-end;
}

.actions button {
	min-height: 32px;
	padding: 6px 8px;
	border: 0;
	border-radius: 6px;
	background: none;
	font: inherit;
	cursor: pointer;
}

.actions .icon {
	color: var(--muted);
	font-size: 1rem;
}

.actions .copy {
	color: var(--accent);
	font-weight: 600;
}

.actions button:hover {
	background: var(--hover);
	color: var(--text);
}

/*
 * The table from 720px of list: its columns need about that much with the
 * longest goal mix, and a narrower table would clip under its rounded border.
 */
@container list (min-width: 720px) {
	table {
		display: table;
	}

	thead {
		display: table-header-group;
	}

	tbody {
		display: table-row-group;
	}

	tbody tr {
		display: table-row;
		padding: 0;
	}

	td,
	th {
		display: table-cell;
		padding: 10px 12px;
		border-bottom: 1px solid var(--line);
		text-align: start;
		vertical-align: middle;
		white-space: nowrap;
	}

	tbody tr:last-child td {
		border-bottom: 0;
	}

	th {
		color: var(--muted);
		font-size: 0.75rem;
		font-weight: 600;
	}

	th.num,
	td.num {
		text-align: end;
	}

	td.note {
		width: 100%;
		max-width: 0;
	}

	td.none {
		display: table-cell;
	}

	.narrow {
		display: none;
	}

	.wide {
		display: inline;
	}

	.wide-cell {
		display: table-cell;
	}

	.goal,
	.saved,
	.money {
		color: var(--text);
		font-size: 0.875rem;
	}
}
</style>
