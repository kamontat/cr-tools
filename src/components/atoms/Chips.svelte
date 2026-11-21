<script lang="ts">
interface Props {
	label: string
	/** `icon` is an image URL; it is decorative, since the label already names the option. */
	options: { value: string; label: string; icon?: string | null; disabled?: boolean }[]
	value: string[]
	multiple?: boolean
	onchange: (value: string[]) => void
}

let { label, options, value, multiple = false, onchange }: Props = $props()

function pick(option: string) {
	if (!multiple) return onchange([option])
	onchange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option])
}
</script>

<!-- biome-ignore lint/a11y/useSemanticElements: a fieldset brings its own border and layout to a row of buttons -->
<div class="chips" role="group" aria-label={label}>
	{#each options as option (option.value)}
		<button
			type="button"
			disabled={option.disabled}
			aria-pressed={value.includes(option.value)}
			onclick={() => pick(option.value)}>
			{#if option.icon}
				<img width="20" height="20" src={option.icon} alt="" loading="lazy">
			{/if}
			<span>{option.label}</span>
		</button>
	{/each}
</div>

<style>
.chips {
	display: flex;
	flex-flow: row wrap;
	gap: 8px;
}

button {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-height: 32px;
	padding: 4px 12px;
	border: 1px solid var(--line);
	border-radius: 999px;
	background: var(--surface);
	color: var(--muted);
	font: inherit;
	cursor: pointer;
}

@media (pointer: coarse) {
	button {
		min-height: var(--tap);
	}
}

button[aria-pressed="true"] {
	border-color: var(--accent);
	color: var(--text);
	box-shadow: inset 0 0 0 1px var(--accent);
}

button:disabled {
	opacity: 0.45;
	cursor: not-allowed;
}

img {
	width: 20px;
	height: 20px;
	border-radius: 4px;
	object-fit: contain;
}
</style>
