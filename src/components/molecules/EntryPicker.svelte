<script lang="ts">
import EntryIcon from "#components/atoms/EntryIcon.svelte"

type Option = { id: string; name: string; src: string | null }

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
}

let { label, searchLabel, options, value, onpick, noneLabel, onclear }: Props = $props()

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
	<input type="search" aria-label={searchLabel} placeholder={searchLabel} bind:value={query}>
	<div class="grid">
		{#if onclear && noneLabel}
			<button type="button" class="cell none" aria-pressed={value === null} onclick={onclear}>{noneLabel}</button>
		{/if}
		{#each options as option (option.id)}
			<button
				type="button"
				class="cell"
				aria-label={option.name}
				aria-pressed={value === option.id}
				hidden={shown !== null && !shown.has(option.id)}
				onclick={() => onpick(option.id)}>
				<EntryIcon src={option.src} name={option.name} size={40} />
				<span class="name" aria-hidden="true">{option.name}</span>
			</button>
		{/each}
	</div>
</div>

<style>
.picker {
	gap: 8px;
}

input {
	min-height: 36px;
	padding: 6px 10px;
	border: 1px solid var(--line);
	border-radius: var(--radius);
	background: var(--surface);
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
	gap: 8px;
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
	border: 1px solid var(--line);
	border-radius: var(--radius-lg);
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
	border-color: var(--accent);
	color: var(--text);
	box-shadow: inset 0 0 0 1px var(--accent);
}

.name {
	max-width: 100%;
	overflow: hidden;
	text-align: center;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
