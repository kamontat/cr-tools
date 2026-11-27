<script lang="ts">
interface Props {
	label: string
	/** `icon` is an image URL; it is decorative, since the label already names the option. */
	options: { value: string; label: string; icon?: string | null; disabled?: boolean; count?: number }[]
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
			{#if value.includes(option.value)}
				<span class="check" aria-hidden="true">✓</span>
			{/if}
			<span>{option.label}</span>
			{#if option.count !== undefined}
				<span class="count" aria-hidden="true">{option.count}</span>
			{/if}
		</button>
	{/each}
</div>

<style>
.chips {
	display: flex;
	flex-flow: row wrap;
	gap: 6px;
}

/* Outlined pills; a picked one turns yellow and leads with a check mark. */
button {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-height: 26px;
	padding: 2px 10px;
	border: var(--border) solid var(--ink);
	border-radius: var(--radius-ctl);
	background: var(--surface);
	color: var(--text);
	font-family: var(--font-ui);
	font-size: 13px;
	cursor: pointer;
}

@media (pointer: coarse) {
	button {
		min-height: var(--tap);
	}
}

button:hover:not(:disabled, [aria-pressed="true"]) {
	background: var(--hover);
}

button[aria-pressed="true"] {
	background: var(--pick);
	color: var(--on-pick);
}

button:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}

button:disabled {
	opacity: 0.45;
	cursor: not-allowed;
}

.check {
	font-weight: 600;
}

/* How many the option would show: quieter than the label, digits in step down a list. */
.count {
	opacity: 0.7;
	font-size: 0.75rem;
	font-variant-numeric: tabular-nums;
}

img {
	width: 20px;
	height: 20px;
	border-radius: calc(var(--radius-sm) - 6px);
	object-fit: contain;
}
</style>
