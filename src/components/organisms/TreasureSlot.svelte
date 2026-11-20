<script lang="ts">
import EntryIcon from "#components/atoms/EntryIcon.svelte"
import EntryPicker from "#components/molecules/EntryPicker.svelte"
import { levelRange, MAX_LEVEL } from "#lib/combi/loadout"

type Option = { id: string; name: string; src: string | null }
type Pick = Option & { levels: number[] }

interface Props {
	/** The slot's number, 1 to 3. */
	index: number
	label: string
	/** The slot's alternatives; each holds at least one level. */
	picks: Pick[]
	options: Option[]
	/** The new picks, in option order — never click order, which would give one slot two codes. */
	onchange: (picks: Pick[]) => void
	labels: {
		add: string
		remove: string
		/** The add picker's search box. */
		search: string
		/** The add picker's line when the search hides everything. */
		noMatch?: string
		allLevels: string
		level: (n: number) => string
	}
}

let { index, label, picks, options, onchange, labels }: Props = $props()

/** Unique per mount, so the docked editor and the panel editor never share an id. */
const uid = $props.id()

const LEVELS = levelRange(0, MAX_LEVEL)

let adding = $state(false)

/** Where a shift-click measures from, per pick: the last level pressed without shift. */
const anchors = new Map<string, number>()

const picked = $derived(new Set(picks.map((pick) => pick.id)))

/** Option order first; a carried pick the options lack keeps its place after them. */
function ordered(list: Pick[]): Pick[] {
	const rank = new Map(options.map((option, at) => [option.id, at]))
	return list
		.map((pick, at) => ({ pick, at, rank: rank.get(pick.id) ?? options.length }))
		.sort((a, b) => a.rank - b.rank || a.at - b.at)
		.map(({ pick }) => pick)
}

function setLevels(id: string, levels: number[]) {
	const sorted = [...new Set(levels)].sort((a, b) => a - b)
	onchange(picks.map((pick) => (pick.id === id ? { ...pick, levels: sorted } : pick)))
}

/** A click toggles one level, never the last; shift holds the range from the anchor. */
function pressLevel(pick: Pick, level: number, event: MouseEvent) {
	if (event.shiftKey) {
		const from = anchors.get(pick.id) ?? Math.min(...pick.levels)
		setLevels(pick.id, levelRange(Math.min(from, level), Math.max(from, level)))
		return
	}
	anchors.set(pick.id, level)
	const on = pick.levels.includes(level)
	if (on && pick.levels.length === 1) return
	setLevels(pick.id, on ? pick.levels.filter((held) => held !== level) : [...pick.levels, level])
}

/** Every level, or back to +0 from every level. */
function pressAll(pick: Pick) {
	setLevels(pick.id, pick.levels.length === LEVELS.length ? [0] : LEVELS)
}

function remove(id: string) {
	anchors.delete(id)
	onchange(picks.filter((pick) => pick.id !== id))
}

/** The add picker toggles: a picked option leaves, another joins at +0. */
function toggle(id: string) {
	if (picked.has(id)) return remove(id)
	const option = options.find((candidate) => candidate.id === id)
	if (option === undefined) return
	onchange(ordered([...picks, { ...option, levels: [0] }]))
}
</script>

<!-- biome-ignore lint/a11y/useSemanticElements: a fieldset brings its own border and legend layout -->
<div class="slot" role="group" aria-labelledby="{uid}-label" data-slot={index}>
	<span class="label" id="{uid}-label">{label}</span>
	{#each picks as pick (pick.id)}
		<!-- biome-ignore lint/a11y/useSemanticElements: a fieldset brings its own border and layout -->
		<div class="pick" role="group" aria-label={pick.name}>
			<div row class="head">
				<EntryIcon src={pick.src} name={pick.name} size={32} />
				<span class="name">{pick.name}</span>
				<button
					type="button"
					class="remove"
					aria-label={labels.remove}
					title={labels.remove}
					onclick={() => remove(pick.id)}>
					×
				</button>
			</div>
			<div row class="levels">
				<div row class="strip">
					{#each LEVELS as level (level)}
						<button
							type="button"
							aria-label={labels.level(level)}
							title={labels.level(level)}
							aria-pressed={pick.levels.includes(level)}
							onclick={(event) => pressLevel(pick, level, event)}>
							+{level}
						</button>
					{/each}
				</div>
				<button
					type="button"
					class="all"
					aria-pressed={pick.levels.length === LEVELS.length}
					onclick={() => pressAll(pick)}>
					{labels.allLevels}
				</button>
			</div>
		</div>
	{/each}
	<button
		type="button"
		class="add"
		aria-expanded={adding}
		aria-controls="{uid}-picker"
		onclick={() => (adding = !adding)}>
		{labels.add}
	</button>
	{#if adding}
		<div class="picker" id="{uid}-picker">
			<EntryPicker
				label={labels.add}
				searchLabel={labels.search}
				noMatchLabel={labels.noMatch}
				{options}
				value={null}
				pressed={(id) => picked.has(id)}
				onpick={toggle} />
		</div>
	{/if}
</div>

<style>
.slot {
	gap: 8px;
}

.label {
	font-weight: 600;
}

.pick {
	gap: 8px;
	padding: 8px 10px;
	border: 1px solid var(--line);
	border-radius: var(--radius-lg);
	background: var(--surface);
}

.head {
	align-items: center;
	gap: 8px;
}

.name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

button {
	border: 1px solid var(--line);
	background: var(--surface);
	color: var(--muted);
	font: inherit;
	cursor: pointer;
}

.remove {
	width: 32px;
	height: 32px;
	padding: 0;
	border-radius: var(--radius);
}

.levels {
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.strip {
	flex-wrap: wrap;
	gap: 2px;
	padding: 2px;
	border-radius: 9px;
	background: var(--hover);
}

.strip button {
	min-width: 32px;
	min-height: 32px;
	padding: 0 4px;
	border: 0;
	border-radius: 7px;
	background: none;
	font-size: 0.8125rem;
}

.strip button[aria-pressed="true"] {
	background: var(--accent);
	color: var(--on-accent);
}

.all,
.add {
	min-height: 32px;
	padding: 4px 12px;
	border-radius: 999px;
}

.all[aria-pressed="true"],
.add[aria-expanded="true"] {
	border-color: var(--accent);
	color: var(--text);
}

.add {
	align-self: flex-start;
}

@media (pointer: coarse) {
	.remove,
	.strip button,
	.all,
	.add {
		min-height: var(--tap);
	}

	.remove {
		width: var(--tap);
	}
}
</style>
