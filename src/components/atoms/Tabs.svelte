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
/* A tab bar: labels in a row over one line, the selected tab underlined. */
.tabs {
	display: flex;
	flex-flow: row nowrap;
	align-items: stretch;
	overflow-x: auto;
	border-bottom: 1px solid var(--line);
}

button {
	position: relative;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-height: 34px;
	padding: 5px 12px;
	border: 0;
	background: none;
	color: var(--muted);
	font-family: var(--font-ui);
	font-size: 13px;
	font-weight: 500;
	white-space: nowrap;
	cursor: pointer;
}

/* A short divider between neighbouring tabs. */
button + button::before {
	position: absolute;
	top: 50%;
	left: 0;
	height: 1em;
	border-left: 1px solid var(--line);
	content: "";
	transform: translateY(-50%);
}

@media (pointer: coarse) {
	button {
		min-height: var(--tap);
	}
}

button:hover:not(:disabled) {
	background: var(--hover);
	color: var(--text);
}

button:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: -2px;
}

button[aria-selected="true"] {
	color: var(--text);
}

/* The selected tab's mark: a thick rounded bar in the primary colour on the line. */
button[aria-selected="true"]::after {
	position: absolute;
	right: 8px;
	bottom: 0;
	left: 8px;
	height: 4px;
	border-radius: var(--radius-sm) var(--radius-sm) 0 0;
	background: var(--accent);
	content: "";
}

button:disabled {
	opacity: 0.45;
	cursor: not-allowed;
}

.badge {
	padding: 0 6px;
	border-radius: var(--radius-ctl);
	background: var(--surface-2);
	color: var(--text);
	font-size: 0.75rem;
}
</style>
