<script lang="ts">
interface Props {
	label: string
	/** `lang` marks an option written in another language than the page, such as a language's own name. */
	options: { value: string; label: string; lang?: string }[]
	value: string
	onchange: (value: string) => void
}

let { label, options, value, onchange }: Props = $props()
</script>

<!-- biome-ignore lint/a11y/useSemanticElements: a fieldset brings its own border and layout to a row of buttons -->
<div class="seg" role="group" aria-label={label}>
	{#each options as option (option.value)}
		<button
			type="button"
			lang={option.lang}
			aria-pressed={option.value === value}
			onclick={() => onchange(option.value)}>
			{option.label}
		</button>
	{/each}
</div>

<style>
/* A sunken, outlined track; the picked option is a yellow pill outlined in ink. */
.seg {
	display: inline-flex;
	flex-flow: row wrap;
	gap: 3px;
	padding: 3px;
	border: var(--border) solid var(--ink);
	border-radius: var(--radius-ctl);
	background: var(--surface-2);
}

/* Compact under a mouse; a finger gets the full tap height. */
button {
	min-height: 26px;
	padding: 2px 10px;
	border: 0;
	border-radius: var(--radius-ctl);
	background: none;
	color: var(--muted);
	font-family: var(--font-ui);
	font-size: 13px;
	font-weight: 500;
	cursor: pointer;
}

@media (pointer: coarse) {
	button {
		min-height: var(--tap);
	}
}

button:hover {
	color: var(--text);
}

button[aria-pressed="true"] {
	outline: var(--border) solid var(--ink);
	outline-offset: calc(var(--border) * -1);
	background: var(--pick);
	color: var(--on-pick);
}

button:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}
</style>
