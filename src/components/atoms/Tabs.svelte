<script lang="ts">
interface Props {
	label: string
	tabs: { value: string; label: string; badge?: string; disabled?: boolean }[]
	value: string
	onchange: (value: string) => void
}

let { label, tabs, value, onchange }: Props = $props()

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
			tabindex={tab.value === value ? 0 : -1}
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
	padding: 6px 12px;
	border: 0;
	border-radius: 999px;
	background: none;
	color: var(--muted);
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

button[aria-selected="true"] {
	background: var(--text);
	color: var(--bg);
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
