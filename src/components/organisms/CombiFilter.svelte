<script lang="ts">
import type { Goal, Mode } from "#lib/combi/codec"
import type { SavedCode } from "#lib/combi/saved"

import { tick } from "svelte"

import Chips from "#components/atoms/Chips.svelte"
import Segmented from "#components/atoms/Segmented.svelte"
import Tabs from "#components/atoms/Tabs.svelte"
import Panel from "#components/molecules/Panel.svelte"
import { episodeArt } from "#lib/combi/art"
import { imageFor, labelFor } from "#lib/combi/catalog"
import { ALL_GOALS, ALL_MODES } from "#lib/combi/codec"
import { episodeText } from "#lib/combi/describe"
import {
	activeFilters,
	DEFAULT_SORT,
	type Facet,
	facetCount,
	filterOptions,
	type ListFilter,
	type ListSort,
	NO_FILTER,
	type RoundsFilter,
	SORT_KEYS,
	type SortKey,
} from "#lib/combi/list"
import { messagesFor } from "#lib/i18n/messages"
import { currentLang, type Lang, onLangChange } from "#lib/lang"

export type ViewTab = "filter" | "sort"

interface Props {
	entries: readonly SavedCode[]
	/** The list's search, which the counts take into account. */
	query: string
	filter: ListFilter
	sort: ListSort
	tab: ViewTab
	/** Below the dock breakpoint: a sheet over the bottom of the page instead of a panel beside the list. */
	sheet: boolean
	/** How many codes the list shows now. */
	shown: number
	onfilter: (filter: ListFilter) => void
	onsort: (sort: ListSort) => void
	ontab: (tab: ViewTab) => void
	onclose: () => void
}

let { entries, query, filter, sort, tab, sheet, shown, onfilter, onsort, ontab, onclose }: Props = $props()

let lang = $state<Lang>(currentLang(document))
const m = $derived(messagesFor(lang))
const t = $derived(m.combi.list)

$effect(() => onLangChange(document, (next) => (lang = next)))

const options = $derived(filterOptions(entries))
const active = $derived(activeFilters(filter))
const title = $derived(tab === "filter" ? t.filter : t.sort)
const tabs = $derived([
	{ value: "filter", label: t.filter, ...(active > 0 ? { badge: String(active) } : {}) },
	{ value: "sort", label: t.sort },
])

const count = (facet: Facet, value: string) => facetCount(entries, query, filter, facet, value)

/** Chips for a facet: each option with its count, off when it would show nothing and is not picked. */
const facetOptions = (
	facet: Facet,
	values: readonly string[],
	label: (value: string) => string,
	icon?: (value: string) => string | null,
) =>
	values.map((value) => {
		const n = count(facet, value)
		const picked = (filter[facet] as readonly string[]).includes(value)
		return { value, label: label(value), count: n, disabled: n === 0 && !picked, icon: icon?.(value) ?? null }
	})

/** Picks written in the options' own order, never in click order. */
const inOrder = <T extends string>(order: readonly T[], picked: readonly string[]) =>
	order.filter((value) => picked.includes(value))

const pickGoals = (value: string[]) => onfilter({ ...filter, goals: inOrder<Goal>(ALL_GOALS, value) })
const pickEpisodes = (value: string[]) => onfilter({ ...filter, episodes: inOrder(options.episodes, value) })
const pickCookies = (value: string[]) => onfilter({ ...filter, cookies: inOrder(options.cookies, value) })
const pickMode = (value: string) =>
	onfilter({ ...filter, mode: (ALL_MODES as readonly string[]).includes(value) ? (value as Mode) : "any" })
const pickRounds = (value: string) =>
	onfilter({ ...filter, rounds: value === "with" || value === "without" ? (value as RoundsFilter) : "any" })

const pickSort = (key: SortKey) => {
	if (key !== sort.key) onsort({ key, reverse: false })
}

const cookieIcon = (id: string) => {
	const image = imageFor("cookies", id)
	return image === null ? null : `/assets/${image}`
}

const isSorted = $derived(sort.key !== DEFAULT_SORT.key || sort.reverse !== DEFAULT_SORT.reverse)

/** The sheet takes focus when it opens, on its tab, and hands it back to whatever had it when it closes. */
const sheetFocus = (node: HTMLElement) => {
	const before = document.activeElement instanceof HTMLElement ? document.activeElement : null
	void tick().then(() => node.querySelector<HTMLElement>('[role="tab"][tabindex="0"]')?.focus())
	return () => {
		if (before?.isConnected) before.focus()
	}
}

const onsheetkeydown = (event: KeyboardEvent) => {
	if (event.key !== "Escape" || event.defaultPrevented) return
	event.preventDefault()
	onclose()
}
</script>

{#snippet body()}
	<div class="tabs">
		<Tabs
			label={t.filterAndSort}
			{tabs}
			value={tab}
			onchange={(value) => ontab(value === "sort" ? "sort" : "filter")} />
	</div>
	{#if tab === "filter"}
		<div class="fields" role="tabpanel" aria-label={t.filter}>
			<div class="field">
				<div row class="field-head">
					<span class="label">{t.goalFilter}</span><span class="hint">{t.goalHint}</span>
				</div>
				<Chips
					label={t.goalFilter}
					multiple
					options={facetOptions("goals", ALL_GOALS, (goal) => m.combi.goals[goal as Goal])}
					value={[...filter.goals]}
					onchange={pickGoals} />
			</div>
			<div class="field">
				<div row class="field-head"><span class="label">{t.mode}</span></div>
				<Segmented
					label={t.mode}
					options={[
						{ value: "any", label: t.any },
						...ALL_MODES.map((mode) => ({ value: mode, label: m.combi.modes[mode] })),
					]}
					value={filter.mode}
					onchange={pickMode} />
			</div>
			{#if options.episodes.length > 0}
				<div class="field">
					<div row class="field-head"><span class="label">{t.episode}</span></div>
					<Chips
						label={t.episode}
						multiple
						options={facetOptions(
							"episodes",
							options.episodes,
							(episode) => episodeText(episode as never, m),
							(episode) => episodeArt(episode as never, "/assets/"),
						)}
						value={[...filter.episodes]}
						onchange={pickEpisodes} />
				</div>
			{/if}
			{#if options.cookies.length > 0}
				<div class="field">
					<div row class="field-head">
						<span class="label">{t.cookie}</span><span class="hint">{t.cookieHint}</span>
					</div>
					<Chips
						label={t.cookie}
						multiple
						options={facetOptions("cookies", options.cookies, (id) => labelFor("cookies", id), cookieIcon)}
						value={[...filter.cookies]}
						onchange={pickCookies} />
				</div>
			{/if}
			<div class="field">
				<div row class="field-head"><span class="label">{t.roundsFilter}</span></div>
				<Segmented
					label={t.roundsFilter}
					options={[
						{ value: "any", label: t.any },
						{ value: "with", label: t.withRounds },
						{ value: "without", label: t.withoutRounds },
					]}
					value={filter.rounds}
					onchange={pickRounds} />
			</div>
		</div>
	{:else}
		<div class="fields" role="tabpanel" aria-label={t.sort}>
			<div class="field">
				<div row class="field-head"><span class="label">{t.order}</span></div>
				<Segmented
					label={t.order}
					options={[
						{ value: "natural", label: t.orders[sort.key].natural },
						{ value: "reversed", label: t.orders[sort.key].reversed },
					]}
					value={sort.reverse ? "reversed" : "natural"}
					onchange={(value) => onsort({ key: sort.key, reverse: value === "reversed" })} />
			</div>
			<fieldset class="field">
				<legend class="label">{t.sortBy}</legend>
				<div class="sorts">
					{#each SORT_KEYS as key (key)}
						<label class="sort">
							<input
								type="radio"
								name="combi-sort"
								value={key}
								checked={sort.key === key}
								onchange={() => pickSort(key)}>
							<span class="what">
								{t.sorts[key]}
								{#if key === "goal"}
									<span class="why">{t.goalSortHint}</span>
								{/if}
							</span>
						</label>
					{/each}
				</div>
			</fieldset>
		</div>
	{/if}
{/snippet}

{#snippet clearButton()}
	{#if tab === "filter"}
		<button type="button" class="btn" disabled={active === 0} onclick={() => onfilter(NO_FILTER)}>
			{t.clearFilters}
		</button>
	{:else}
		<button type="button" class="btn" disabled={!isSorted} onclick={() => onsort(DEFAULT_SORT)}>{t.resetSort}</button>
	{/if}
{/snippet}

{#if sheet}
	<div class="scrim" aria-hidden="true" onclick={onclose}></div>
	<section class="sheet" aria-labelledby="combi-view-title" onkeydown={onsheetkeydown} {@attach sheetFocus}>
		<div class="grab" aria-hidden="true"></div>
		<header row class="sheet-head">
			<h2 id="combi-view-title">{title}</h2>
			<button type="button" class="close" aria-label={m.frame.close} onclick={onclose}>✕</button>
		</header>
		<div class="sheet-body">{@render body()}</div>
		<footer row class="sheet-foot">
			{@render clearButton()}
			<button type="button" class="btn primary" onclick={onclose}>{t.showCodes(shown)}</button>
		</footer>
	</section>
{:else}
	<Panel id="list-view" {title} open={true} {onclose} closeLabel={m.frame.close} resizeLabel={m.frame.resize}>
		<div class="view">{@render body()}</div>
		{#snippet footer()}
			<span class="shown">{t.shown(shown, entries.length)}</span>
			{@render clearButton()}
		{/snippet}
	</Panel>
{/if}

<style>
.view {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.tabs {
	position: sticky;
	top: 0;
	z-index: 1;
	background: var(--surface);
}

.fields {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.field {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.field-head {
	align-items: baseline;
	gap: 8px;
}

.label {
	font-weight: 600;
}

.hint {
	color: var(--muted);
	font-size: 0.8125rem;
}

/* The sort choices: radio rows in one box, the picked one's dot filled. */
.sorts {
	display: flex;
	flex-direction: column;
	border: 1px solid var(--line);
	border-radius: var(--radius-lg);
	overflow: hidden;
}

fieldset.field {
	min-width: 0;
	margin: 0;
	padding: 0;
	border: 0;
}

legend.label {
	padding: 0;
	margin-bottom: 8px;
}

.sort {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 10px;
	min-height: 40px;
	padding: 6px 12px;
	border-bottom: 1px solid var(--line);
	color: var(--text);
	cursor: pointer;
}

.sort:last-child {
	border-bottom: 0;
}

.sort:hover {
	background: var(--hover);
}

.sort:has(input:focus-visible) {
	outline: 2px solid var(--accent);
	outline-offset: -2px;
}

/* The radio drawn as a ring, filled thick when picked. */
.sort input {
	flex: none;
	width: 16px;
	height: 16px;
	margin: 0;
	border: 2px solid var(--line);
	border-radius: 50%;
	appearance: none;
	cursor: pointer;
}

.sort input:checked {
	border: 5px solid var(--accent);
}

.sort input:focus-visible {
	outline: none;
}

.what {
	display: flex;
	flex-direction: column;
}

.why {
	color: var(--muted);
	font-size: 0.75rem;
}

.btn {
	min-height: 38px;
	padding: 7px 14px;
	border: 1px solid var(--line);
	border-radius: var(--radius);
	background: var(--surface);
	color: var(--text);
	font: inherit;
	font-weight: 600;
	cursor: pointer;
}

.btn:hover:not(:disabled) {
	background: var(--hover);
}

.btn:disabled {
	opacity: 0.45;
	cursor: not-allowed;
}

.btn.primary {
	border-color: var(--accent);
	background: var(--accent);
	color: var(--on-accent);
}

.shown {
	flex: 1;
	align-self: center;
	color: var(--muted);
	font-size: 0.8125rem;
}

/* Below the dock breakpoint (DOCK_MIN_WIDTH in #lib/frame): a sheet over the bottom of the page. */
.scrim {
	position: fixed;
	inset: 0;
	z-index: var(--z-sheet);
	background: rgb(0 0 0 / 50%);
}

.sheet {
	position: fixed;
	right: 0;
	bottom: 0;
	left: 0;
	z-index: var(--z-sheet);
	display: flex;
	flex-direction: column;
	max-width: 640px;
	max-height: 86dvh;
	margin: 0 auto;
	border-radius: 16px 16px 0 0;
	background: var(--surface);
	box-shadow: 0 -8px 24px rgb(0 0 0 / 35%);
}

.grab {
	flex: none;
	width: 36px;
	height: 5px;
	margin: 8px auto 0;
	border-radius: 999px;
	background: var(--line);
}

.sheet-head {
	align-items: center;
	gap: 8px;
	padding: 4px 12px 4px 20px;
}

.sheet-head h2 {
	flex: 1;
	margin: 0;
	font-size: 17px;
}

.close {
	display: grid;
	place-items: center;
	width: var(--tap);
	height: var(--tap);
	border: 0;
	border-radius: var(--radius);
	background: none;
	color: var(--muted);
	font-size: 18px;
	cursor: pointer;
}

.close:hover {
	background: var(--hover);
	color: var(--text);
}

.sheet-body {
	display: flex;
	flex-direction: column;
	gap: 16px;
	min-height: 0;
	padding: 0 20px 16px;
	overflow-y: auto;
}

.sheet-foot {
	gap: 8px;
	padding: 12px 20px calc(12px + env(safe-area-inset-bottom, 0px));
	border-top: 1px solid var(--line);
}

.sheet-foot .btn {
	flex: 1;
}

@media (pointer: coarse) {
	.btn,
	.sort {
		min-height: var(--tap);
	}
}

@media (prefers-reduced-motion: no-preference) {
	.sheet {
		animation: rise 0.22s ease-out;
	}

	.scrim {
		animation: fade 0.22s ease-out;
	}
}

@keyframes rise {
	from {
		transform: translateY(30%);
	}
}

@keyframes fade {
	from {
		opacity: 0;
	}
}
</style>
