<script lang="ts">
import type { EntryKind } from "#lib/combi/catalog"

import EntryIcon from "#components/atoms/EntryIcon.svelte"

type Option = { id: string; name: string; src: string | null; kind?: EntryKind }

interface Props {
	/** The group's name. */
	label: string
	/** The search box's name. */
	searchLabel: string
	options: Option[]
	value: string | null
	onpick: (id: string) => void
	/** The clear button's text; shown only with `onclear`. */
	noneLabel?: string
	onclear?: () => void
	/** Which options read as picked; one option, `value`, by default. A multi-pick caller says its own. */
	pressed?: (id: string) => boolean
	/** The line shown when the search hides every option. */
	noMatchLabel?: string
}

let { label, searchLabel, options, value, onpick, noneLabel, onclear, pressed, noMatchLabel }: Props = $props()

const isPressed = $derived(pressed ?? ((id: string) => id === value))

let query = $state("")

/**
 * The ids the search leaves, or null for all. A miss hides its button rather
 * than removing it, so a keystroke re-creates no image across 300 options.
 */
const shown = $derived.by(() => {
	const words = query.trim().toLowerCase()
	if (words === "") return null
	return new Set(options.filter((option) => option.name.toLowerCase().includes(words)).map((option) => option.id))
})
</script>

<!-- biome-ignore lint/a11y/useSemanticElements: a fieldset brings its own border and layout -->
<div class="picker" role="group" aria-label={label}>
	<input type="search" name="entry-search" aria-label={searchLabel} placeholder={searchLabel} bind:value={query}>
	<div class="grid">
		{#if onclear && noneLabel}
			<button type="button" class="cell none" aria-pressed={value === null} onclick={onclear}>{noneLabel}</button>
		{/if}
		{#each options as option (option.id)}
			<button
				type="button"
				class="cell"
				aria-label={option.name}
				aria-pressed={isPressed(option.id)}
				hidden={shown !== null && !shown.has(option.id)}
				onclick={() => onpick(option.id)}>
				<EntryIcon src={option.src} name={option.name} kind={option.kind} size={40} />
				<span class="name" aria-hidden="true">{option.name}</span>
			</button>
		{/each}
	</div>
	{#if noMatchLabel && shown !== null && shown.size === 0}
		<p class="empty">{noMatchLabel}</p>
	{/if}
</div>

<style>
.picker {
	gap: var(--stack);
}

input {
	min-height: var(--ctl);
	padding: 3px 14px;
	border: var(--border) solid var(--ink);
	border-radius: var(--radius-ctl);
	background: var(--surface-2);
	color: var(--text);
	font: inherit;
}

@media (pointer: coarse) {
	input {
		min-height: var(--tap);
	}
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
	gap: var(--stack);
}

.empty {
	margin: 0;
	color: var(--muted);
	font-size: 0.8125rem;
}

.cell {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4px;
	min-width: 0;
	min-height: 76px;
	padding: 6px 4px;
	border: var(--border) solid var(--line);
	border-radius: var(--radius-sm);
	background: var(--surface);
	color: var(--muted);
	font: inherit;
	font-size: 0.75rem;
	cursor: pointer;
}

/* The reset's [hidden] loses to the display above; a filtered-out cell must still go. */
.cell[hidden] {
	display: none;
}

.cell:hover {
	background: var(--hover);
}

.cell[aria-pressed="true"] {
	border-color: var(--ink);
	background: var(--pick);
	color: var(--on-pick);
}

.name {
	max-width: 100%;
	overflow: hidden;
	text-align: center;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
