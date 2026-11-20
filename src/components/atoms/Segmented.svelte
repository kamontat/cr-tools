<script lang="ts">
interface Props {
	label: string
	options: { value: string; label: string }[]
	value: string
	onchange: (value: string) => void
}

let { label, options, value, onchange }: Props = $props()
</script>

<!-- biome-ignore lint/a11y/useSemanticElements: a fieldset brings its own border and layout to a row of buttons -->
<div class="seg" role="group" aria-label={label}>
	{#each options as option (option.value)}
		<button type="button" aria-pressed={option.value === value} onclick={() => onchange(option.value)}>
			{option.label}
		</button>
	{/each}
</div>

<style>
.seg {
	display: inline-flex;
	flex-flow: row wrap;
	gap: 2px;
	padding: 2px;
	border-radius: 9px;
	background: var(--hover);
}

/* Compact under a mouse; a finger gets the full tap height. */
button {
	min-height: 32px;
	padding: 4px 12px;
	border: 0;
	border-radius: 7px;
	background: none;
	color: var(--muted);
	font: inherit;
	font-weight: 500;
	cursor: pointer;
}

@media (pointer: coarse) {
	button {
		min-height: var(--tap);
	}
}

button[aria-pressed="true"] {
	background: var(--surface);
	color: var(--text);
	box-shadow: 0 1px 2px rgb(0 0 0 / 25%);
}
</style>
