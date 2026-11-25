<script lang="ts">
import type { SavedCode } from "#lib/combi/saved"
import type { TabName } from "#lib/combi/state"

import { SvelteSet } from "svelte/reactivity"

import EntryIcon from "#components/atoms/EntryIcon.svelte"
import ShareBox from "#components/organisms/ShareBox.svelte"
import { episodeArt } from "#lib/combi/art"
import { ALL_GOALS } from "#lib/combi/codec"
import { episodeText, floorText, goalsText } from "#lib/combi/describe"
import { combiSectionOf } from "#lib/combi/full-code"
import { BOOST_LABELS, COOKIE_POWER_LABELS, RANDOM_BOOST_LABELS } from "#lib/combi/labels"
import {
	filterList,
	type GoalFilter,
	LIST_SORTS,
	type ListSort,
	readListSort,
	roundCount,
	rowBoosts,
	rowFull,
	rowLoadout,
	rowStats,
	rowTeam,
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
	/** Opens the entry in the editor, on `tab` when a line of its row asks for one. */
	onopen: (entry: SavedCode, tab?: TabName) => void
	oncopy: (entry: SavedCode) => void
	ondelete: (entry: SavedCode) => void
}

let { entries, current, onnew, onopen, oncopy, ondelete }: Props = $props()

/** The rows whose Share is open, in place under their actions. */
const sharing = new SvelteSet<string>()

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
/** The lines, by `namesKey`, showing each picture's name under it. */
const named = new SvelteSet<string>()

/** One line of one row at a time: its key is the code and the line's label. */
const namesKey = (code: string, label: string) => `${code}\n${label}`
const namesOn = (code: string, label: string) => named.has(namesKey(code, label))

const toggleNames = (code: string, label: string) => {
	const key = namesKey(code, label)
	if (named.has(key)) named.delete(key)
	else named.add(key)
}
/** The code whose Delete was pressed once and now asks to be pressed again. */
let arming = $state<string | null>(null)

const toggle = (code: string) => {
	if (expanded.has(code)) {
		expanded.delete(code)
		if (arming === code) arming = null
	} else expanded.add(code)
}

/** What an open row's Run line says beyond the mode: the goals, the floor and a starting action. */
const runOf = (code: string) => {
	const full = rowFull(code)
	if (full === null) return null
	const { combi } = full
	return {
		mode: m.combi.modes[combi.mode],
		goals: goalsText(combi.goals, m),
		goalNames: combi.goals.map((goal) => m.combi.goals[goal]),
		episode: episodeText(combi.episode, m),
		art: episodeArt(combi.episode, "/assets/"),
		floor: combi.episode === "special2" ? floorText(combi.floor, m) : null,
		action: combi.action === "none" ? null : m.combi.actions[combi.action],
	}
}

/**
 * A row's stats: the goals' averages and time, a dash where no round noted one; with
 * `all`, every other stat a round noted too. The goals' are marked.
 */
const statsOf = (entry: SavedCode, all = false) => {
	const stats = rowStats(entry, all)
	const aimed = new Set(rowStats(entry).map((stat) => stat.field))
	aimed.delete("time")
	return stats.map(({ field, value }) => ({
		field,
		label: field === "time" ? m.combi.list.time : m.combi.editor.statLabels[field],
		value: value === null ? "—" : field === "time" ? clock(value) : money.format(value),
		aimed: aimed.has(field),
	}))
}

/** Seconds as minutes and seconds, `2:05`. */
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`

/** The first press asks; the second, on the same button, deletes. */
const remove = (entry: SavedCode) => {
	if (arming !== entry.code) {
		arming = entry.code
		return
	}
	arming = null
	expanded.delete(entry.code)
	sharing.delete(entry.code)
	for (const key of [...named]) if (key.startsWith(`${entry.code}\n`)) named.delete(key)
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
			name="search"
			aria-label={m.combi.list.search}
			placeholder={m.combi.list.search}
			bind:value={query}>
		<select
			name="goal"
			aria-label={m.combi.list.columns.goal}
			value={goal}
			onchange={(event) => pickGoal(event.currentTarget.value)}>
			<option value="all">{m.combi.list.allGoals}</option>
			{#each ALL_GOALS as id (id)}
				<option value={id}>{m.combi.goals[id]}</option>
			{/each}
		</select>
		<select
			name="sort"
			aria-label={m.combi.list.sortBy}
			value={sort}
			onchange={(event) => pickSort(event.currentTarget.value)}>
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
				{@const run = runOf(entry.code)}
				{@const rounds = roundCount(entry)}
				{@const icons = rowLoadout(entry.code)}
				{@const open = expanded.has(entry.code)}
				{@const id = `entry-details-${index}`}
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
							<span class="code">{game}</span>
							{#if run !== null}
								<span class="badges">
									<span class="badge mode">{run.mode}</span>
									<span class="sep" aria-hidden="true">·</span>
									<span class="badge episode">{run.episode}</span>
									{#each run.goalNames as name (name)}
										<span class="sep" aria-hidden="true">·</span>
										<span class="badge goal">{name}</span>
									{/each}
								</span>
							{:else}
								<!-- A code that no longer reads still says what it was for. -->
								<span class="episode">{descriptionTitle(entry.description)}</span>
							{/if}
							{#if !open}
								<span class="stats">
									{#each statsOf(entry) as stat (stat.field)}
										<span class="stat">
											<span class="muted">{stat.label}</span>
											<strong class:aimed={stat.aimed}>{stat.value}</strong>
										</span>
									{/each}
									<span class="muted">{m.combi.list.rounds(rounds)}</span>
								</span>
							{/if}
						</span>
						<span class="chevron" aria-hidden="true"></span>
					</button>
					{#if open}
						{@const team = rowTeam(entry.code) ?? []}
						{@const members = team.filter((piece) => piece.role !== "treasure")}
						{@const slots = team.filter((piece) => piece.role === "treasure")}
						{@const boosts = rowBoosts(entry.code)}
						{@const none = m.combi.describe.none}
						{@const fields = m.combi.describe.fields}
						<div {id} class="details">
							<div class="lines">
								{#snippet line(tab: TabName, label: string, body: import("svelte").Snippet)}
									<div class="row-line" class:names={namesOn(entry.code, label)}>
										<span class="label">{label}</span>
										<div class="value">{@render body()}</div>
										<button
											type="button"
											class="go"
											aria-label={m.combi.list.editSection(label, game)}
											onclick={() => onopen(entry, tab)}>
											<span class="go-mark" aria-hidden="true"></span>
										</button>
									</div>
								{/snippet}
								{#snippet pics(label: string, content: import("svelte").Snippet, stacked = false)}
									<button
										type="button"
										class="pics"
										class:stacked
										aria-pressed={namesOn(entry.code, label)}
										title={m.combi.list.showNames}
										onclick={() => toggleNames(entry.code, label)}>
										{@render content()}
									</button>
								{/snippet}
								{#snippet boostsGate(body: import("svelte").Snippet, empty: boolean)}
									{#if boosts === null}
										<span class="muted">{none}</span>
									{:else if !boosts.used}
										<span class="muted">{m.combi.describe.notUsed}</span>
									{:else if empty}
										<span class="muted">{none}</span>
									{:else}
										{@render body()}
									{/if}
								{/snippet}

								{#snippet runBody()}
									{#if run === null}
										<span class="muted">{none}</span>
									{:else}
										<span class="pill">{run.mode}</span>
										<span class="sep" aria-hidden="true">·</span>
										<span>{run.goals}</span>
										<span class="sep" aria-hidden="true">·</span>
										<span class="with-art">
											{#if run.art}
												<img class="art" width="28" height="28" src={run.art} alt="" loading="lazy">
											{/if}
											{run.episode}
										</span>
										{#if run.floor}
											<span class="sep" aria-hidden="true">·</span>
											<span>{run.floor}</span>
										{/if}
										{#if run.action}
											<span class="sep" aria-hidden="true">·</span>
											<span>{run.action}</span>
										{/if}
									{/if}
								{/snippet}
								{@render line("main", m.combi.list.run, runBody)}

								{#snippet resultsBody()}
									{@const fewer = namesOn(entry.code, m.combi.list.results)}
									<!-- Every stat the rounds noted; a press keeps the goals' stats and time only. -->
									<button
										type="button"
										class="pics"
										aria-pressed={fewer}
										title={m.combi.list.fewerStats}
										onclick={() => toggleNames(entry.code, m.combi.list.results)}>
										{#each statsOf(entry, !fewer) as stat (stat.field)}
											<span class="stat">
												<span class="muted">{stat.label}</span>
												<strong class:aimed={stat.aimed}>{stat.value}</strong>
											</span>
										{/each}
										<span class="muted">{m.combi.list.rounds(rounds)}</span>
									</button>
								{/snippet}
								{@render line("runLog", m.combi.list.results, resultsBody)}

								{#snippet teamBody()}
									{#if members.length === 0}
										<span class="muted">{none}</span>
									{:else}
										{#snippet faces()}
											{#each members as piece, at (at)}
												{@const pick = piece.picks[0]}
												{#if at > 0}
													<span class="sep" aria-hidden="true">·</span>
												{/if}
												{#if pick}
													<span class="cell">
														<EntryIcon
															src={pick.icon.src}
															name={pick.icon.name}
															round={pick.icon.round ?? false}
															size={38} />
														{#if namesOn(entry.code, m.combi.list.team)}
															<span class="caption">{pick.icon.name}</span>
														{/if}
													</span>
												{/if}
											{/each}
										{/snippet}
										{@render pics(m.combi.list.team, faces)}
									{/if}
								{/snippet}
								{@render line("cookies", m.combi.list.team, teamBody)}

								{#snippet treasuresBody()}
									{#if slots.length === 0}
										<span class="muted">{none}</span>
									{:else}
										{#snippet rings()}
											{@const full = namesOn(entry.code, m.combi.editor.tabs.treasures)}
											{#each slots as piece, at (at)}
												<span class="slot">
													{#if piece.position !== undefined}
														<span class="position">{piece.position}</span>
													{/if}
													<!-- Closed, a slot shows its first treasure and how many more it takes; open, every one. -->
													{#each full ? piece.picks : piece.picks.slice(0, 1) as pick, n (n)}
														{#if n > 0}
															<span class="slash" aria-hidden="true">/</span>
														{/if}
														<span class="cell">
															<span class="framed">
																<EntryIcon
																	src={pick.icon.src}
																	name={pick.kind && pick.kind !== "base"
																		? `${pick.icon.name}, ${m.combi.list.kinds[pick.kind]}`
																		: pick.icon.name}
																	kind={pick.kind}
																	size={32} />
																{#if !full && piece.picks.length > 1}
																	<span class="more">+{piece.picks.length - 1}</span>
																{/if}
															</span>
															{#if full}
																<span class="caption">
																	{pick.icon.name}
																	{#if pick.level}
																		<span class="level">{pick.level}</span>
																	{/if}
																</span>
																{#if pick.kind}
																	<span class="kind-word" data-kind={pick.kind}>
																		{m.combi.list.kinds[pick.kind]}
																	</span>
																{/if}
															{/if}
														</span>
													{/each}
												</span>
											{/each}
										{/snippet}
										{@render pics(
											m.combi.editor.tabs.treasures,
											rings,
											namesOn(entry.code, m.combi.editor.tabs.treasures) &&
												slots.some((piece) => piece.picks.length > 1),
										)}
									{/if}
								{/snippet}
								{@render line("treasures", m.combi.editor.tabs.treasures, treasuresBody)}

								{#snippet boostIcons()}
									{#snippet icons()}
										{#each boosts?.boosts ?? [] as boost (boost.id)}
											<span class="cell">
												<EntryIcon src={boost.src} name={BOOST_LABELS[boost.id]} size={36} />
												{#if namesOn(entry.code, m.combi.editor.tabs.boosts)}
													<span class="caption">{BOOST_LABELS[boost.id]}</span>
												{/if}
											</span>
										{/each}
									{/snippet}
									{@render pics(m.combi.editor.tabs.boosts, icons)}
								{/snippet}
								{#snippet boostsBody()}
									{@render boostsGate(boostIcons, (boosts?.boosts.length ?? 0) === 0)}
								{/snippet}
								{@render line("boosts", m.combi.editor.tabs.boosts, boostsBody)}

								{#snippet randomText()}
									{#if boosts?.random}
										<span>{RANDOM_BOOST_LABELS[boosts.random]}</span>
									{/if}
								{/snippet}
								{#snippet randomBody()}
									{@render boostsGate(randomText, (boosts?.random ?? null) === null)}
								{/snippet}
								{@render line("boosts", fields.randomBoost, randomBody)}

								{#snippet powerFaces()}
									{#snippet powers()}
										{#each boosts?.powers ?? [] as power (power.id)}
											<span class="cell">
												<span
													class="faces"
													role="img"
													aria-label={COOKIE_POWER_LABELS[power.id]}
													title={COOKIE_POWER_LABELS[power.id]}>
													{#each power.srcs.slice(0, 2) as src (src)}
														<img width="30" height="30" {src} alt="" loading="lazy">
													{/each}
												</span>
												{#if namesOn(entry.code, fields.cookiePower)}
													<span class="caption">{COOKIE_POWER_LABELS[power.id]}</span>
												{/if}
											</span>
										{/each}
									{/snippet}
									{@render pics(fields.cookiePower, powers)}
								{/snippet}
								{#snippet powersBody()}
									{@render boostsGate(powerFaces, (boosts?.powers.length ?? 0) === 0)}
								{/snippet}
								{@render line("boosts", fields.cookiePower, powersBody)}

								{#snippet noteBody()}
									{#if entry.description.trim() === ""}
										<span class="muted">{none}</span>
									{:else}
										<span class="note-text">{entry.description}</span>
									{/if}
								{/snippet}
								{@render line("runLog", m.combi.list.note, noteBody)}
							</div>
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
										aria-expanded={sharing.has(entry.code)}
										onclick={() => (sharing.has(entry.code) ? sharing.delete(entry.code) : sharing.add(entry.code))}>
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
							{#if sharing.has(entry.code)}
								<ShareBox entry={{ code: entry.code, note: entry.description, rounds: entry.rounds ?? [] }} />
							{/if}
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

.code {
	color: var(--code);
	font-family: var(--mono);
	font-size: 1.125rem;
	font-weight: 700;
	letter-spacing: 0.08em;
}

/* The second line: what the run is, most important first: the mode (filled), the episode (outlined), then every goal (muted). */
.badges {
	display: flex;
	flex-flow: row wrap;
	gap: 4px 6px;
	align-items: center;
}

.badge {
	padding: 1px 8px;
	border: 1px solid var(--line);
	border-radius: 999px;
	font-size: 0.75rem;
	font-weight: 600;
	line-height: 1.5;
	white-space: nowrap;
}

.badge.mode {
	border-color: var(--accent);
	background: var(--accent);
	color: var(--bg);
}

.badge.episode {
	border-color: var(--accent);
	color: var(--accent);
}

.badge.goal {
	color: var(--muted);
	font-weight: 400;
}

.episode {
	color: var(--muted);
	font-size: 0.8125rem;
}

/* The saved stats under a closed row; an open row lists them in its Results line instead. */
.stats {
	display: flex;
	flex-flow: row wrap;
	gap: 2px 14px;
	font-size: 0.8125rem;
}

.note-text {
	white-space: pre-line;
	overflow-wrap: anywhere;
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

/* An open row: the old summary's lines (run, cookies, treasures, boosts, results), each a way to its tab. */
.details {
	display: flex;
	flex-direction: column;
	gap: 10px;
	/* The head's hover colour fills it to its bottom edge, so the details start a step below. */
	margin: 12px 16px 14px;
	padding: 4px 14px 12px;
	border-radius: var(--radius-lg);
	background: var(--bg);
}

.lines {
	display: flex;
	flex-direction: column;
}

.row-line {
	display: grid;
	grid-template-columns: 96px minmax(0, 1fr) auto;
	gap: 12px;
	align-items: center;
	min-height: 54px;
	padding: 8px 0;
}

.row-line + .row-line {
	border-top: 1px solid var(--line);
}

.label {
	color: var(--muted);
	font-size: 0.8125rem;
}

.value {
	display: flex;
	flex-flow: row wrap;
	gap: 6px 10px;
	align-items: center;
	min-width: 0;
}

.muted,
.sep,
.slash {
	color: var(--muted);
}

.pill {
	padding: 1px 8px;
	border: 2px solid var(--accent);
	border-radius: 6px;
	color: var(--accent);
	font-size: 0.8125rem;
	font-weight: 600;
}

.tag {
	padding: 1px 8px;
	border: 1px solid var(--line);
	border-radius: 6px;
	color: var(--muted);
	font-size: 0.8125rem;
}

.with-art {
	display: inline-flex;
	gap: 6px;
	align-items: center;
}

.art {
	width: 28px;
	height: 28px;
	object-fit: contain;
}

/* The pictures are one button: a press shows each one's name under it, a second hides them. */
.pics {
	display: flex;
	flex-flow: row wrap;
	gap: 8px 12px;
	align-items: center;
	min-width: 0;
	padding: 4px;
	border: 0;
	border-radius: var(--radius);
	background: none;
	color: inherit;
	font: inherit;
	text-align: start;
	cursor: pointer;
}

.pics:hover {
	background: var(--hover);
}

.pics:focus-visible,
.go:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 1px;
}

.names .pics {
	align-items: flex-start;
}

.cell {
	display: inline-flex;
	flex-direction: column;
	gap: 4px;
	align-items: center;
}

.names .cell {
	width: 76px;
	text-align: center;
}

.caption {
	display: -webkit-box;
	overflow: hidden;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	font-size: 0.6875rem;
	line-height: 1.25;
}

.level {
	color: var(--muted);
	font-variant-numeric: tabular-nums;
}

/* An open slot with many treasures wraps inside the line rather than running past it. */
.slot {
	display: inline-flex;
	flex-wrap: wrap;
	gap: 4px;
	align-items: center;
	max-width: 100%;
}

.names .slot {
	align-items: flex-start;
}

.position {
	color: var(--muted);
	font-size: 0.75rem;
	font-variant-numeric: tabular-nums;
}

/* With names shown, the marks between pictures line up with the pictures, not the names. */
.names .pics .sep,
.names .pics .slash,
.names .pics .position {
	line-height: 38px;
}

/* A treasure's picture, framed by its kind; the +N of a closed slot sits on its corner. */
.framed {
	position: relative;
	display: inline-flex;
}

/* A treasure's kind under its name, in the kind's colour. */
.kind-word {
	display: block;
	color: var(--muted);
	font-size: 0.6875rem;
	font-weight: 600;
}

.kind-word[data-kind="evolved"] {
	color: var(--evolved);
}

.kind-word[data-kind="blessed"] {
	color: var(--blessed);
}

/* How many more treasures a closed slot takes, on the picture's corner. */
.more {
	position: absolute;
	right: -8px;
	bottom: -4px;
	padding: 0 5px;
	border: 1px solid var(--line);
	border-radius: 999px;
	background: var(--surface);
	color: var(--text);
	font-size: 0.6875rem;
	font-weight: 700;
	line-height: 1.4;
}

.faces {
	display: inline-flex;
}

/* An open treasure line with alternatives: one slot per line, so each slot's "or" reads as its own. */
.pics.stacked {
	flex-direction: column;
	align-items: flex-start;
}

.faces img {
	width: 30px;
	height: 30px;
	object-fit: contain;
}

.faces img + img {
	margin-inline-start: -12px;
}

.stat {
	display: inline-flex;
	gap: 6px;
	align-items: baseline;
	font-variant-numeric: tabular-nums;
}

.stat strong {
	font-weight: 600;
}

.stat strong.aimed {
	color: var(--accent);
}

/* The way to the line's tab. */
.go {
	display: flex;
	align-items: center;
	align-self: stretch;
	justify-content: center;
	width: 36px;
	border: 0;
	border-radius: var(--radius);
	background: none;
	color: var(--muted);
	cursor: pointer;
}

.go:hover {
	background: var(--hover);
	color: var(--accent);
}

.go-mark {
	width: 8px;
	height: 8px;
	border-top: 2px solid currentColor;
	border-right: 2px solid currentColor;
	transform: translateX(-2px) rotate(45deg);
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

	.row-line {
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 4px 8px;
	}

	.label {
		grid-column: 1 / -1;
	}
}
</style>
