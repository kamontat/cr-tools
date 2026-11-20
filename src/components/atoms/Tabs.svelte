<script lang="ts">
interface Props {
	label: string
	tabs: { value: string; label: string; badge?: string; disabled?: boolean }[]
	value: string
	onchange: (value: string) => void
}

let { label, tabs, value, onchange }: Props = $props()

/** The one tab stop: the selected tab, or the first enabled tab when the value matches none. */
const stop = $derived(tabs.find((t) => t.value === value && !t.disabled)?.value ?? tabs.find((t) => !t.disabled)?.value)

let buttons: Record<string, HTMLButtonElement | undefined> = {}

function onkeydown(event: KeyboardEvent, from: number) {
	const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0
	if (step === 0) return
	event.preventDefault()
	for (let i = 1; i <= tabs.length; i++) {
		const next = tabs[(from + step * i + tabs.length * i) % tabs.length]
		if (next && !next.disabled) {
			onchange(next.value)
			buttons[next.value]?.focus()
			return
		}
	}
}
</script>

<div class="tabs" role="tablist" aria-label={label}>
	{#each tabs as tab, index (tab.value)}
		<button
			type="button"
			role="tab"
			bind:this={buttons[tab.value]}
			aria-selected={tab.value === value}
			tabindex={tab.value === stop ? 0 : -1}
			disabled={tab.disabled}
			onclick={() => onchange(tab.value)}
			onkeydown={(event) => onkeydown(event, index)}>
			{tab.label}
			{#if tab.badge}
				<span class="badge">{tab.badge}</span>
			{/if}
		</button>
	{/each}
</div>

<style>
.tabs {
	display: flex;
	flex-flow: row nowrap;
	gap: 4px;
	overflow-x: auto;
}

button {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-height: 32px;
	padding: 6px 14px;
	border: 1px solid var(--line);
	border-radius: 999px;
	background: var(--surface);
	color: var(--text);
	font: inherit;
	font-weight: 500;
	white-space: nowrap;
	cursor: pointer;
}

@media (pointer: coarse) {
	button {
		min-height: var(--tap);
	}
}

button:hover:not(:disabled) {
	border-color: var(--accent);
}

button:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}

button[aria-selected="true"] {
	border-color: var(--accent);
	background: var(--accent);
	color: var(--on-accent);
}

button:disabled {
	opacity: 0.45;
	cursor: not-allowed;
}

.badge {
	padding: 0 6px;
	border-radius: 999px;
	background: var(--hover);
	color: var(--text);
	font-size: 0.75rem;
}
</style>
