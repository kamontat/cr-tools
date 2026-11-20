<script lang="ts">
import type { Snippet } from "svelte"

import HelpToggle from "#components/atoms/HelpToggle.svelte"

interface Props {
	/** Prefix of the label's and the help's ids: `<id>-label`, `<id>-help`. */
	id: string
	label: string
	help: string
	/** The help button's name, in the page's language. */
	helpLabel: string
	/** A muted line under the label, such as what the episode leaves out. */
	note?: string
	children: Snippet
}

let { id, label, help, helpLabel, note, children }: Props = $props()

let open = $state(false)
</script>

<!-- biome-ignore lint/a11y/useSemanticElements: a fieldset brings its own border and legend layout -->
<div class="field" role="group" aria-labelledby="{id}-label">
	<div row class="head">
		<span class="label" id="{id}-label">{label}</span>
		<HelpToggle label={helpLabel} controls="{id}-help" expanded={open} ontoggle={() => (open = !open)} />
	</div>
	{#if open}
		<p class="help" id="{id}-help">{help}</p>
	{/if}
	{#if note}
		<p class="note">{note}</p>
	{/if}
	{@render children()}
</div>

<style>
.field {
	gap: 8px;
}

.head {
	align-items: center;
	gap: 8px;
}

.label {
	font-weight: 600;
}

.help,
.note {
	margin: 0;
	color: var(--muted);
	font-size: 0.8125rem;
}

.help {
	padding: 8px 12px;
	border: 1px solid var(--line);
	border-radius: var(--radius);
	background: var(--surface);
}
</style>
