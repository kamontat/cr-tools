<script lang="ts">
import type { Snippet } from "svelte"

import Surface from "#components/atoms/Surface.svelte"

interface Props {
	label: string
	/** Muted, on the right of the row. */
	value?: string
	/** Under the label, such as the storage bar; stays when the row is folded. */
	aside?: Snippet
	/** The body, shown in place under the row while it is open. */
	children: Snippet
	open?: boolean
}

let { label, value, aside, children, open = $bindable(false) }: Props = $props()

/** Unique per mount: a page holds several rows. */
const uid = $props.id()
</script>

<!-- A row that opens in place: no pop-up, no dialog, a second press folds it. -->
<Surface kind="row" element="section" class="item">
	<button
		type="button"
		class="row"
		aria-expanded={open}
		aria-controls={open ? `${uid}-body` : undefined}
		aria-labelledby={value === undefined ? `${uid}-label` : `${uid}-label ${uid}-value`}
		onclick={() => (open = !open)}>
		<span id="{uid}-label" class="label">{label}</span>
		{#if value !== undefined}
			<span id="{uid}-value" class="value">{value}</span>
		{/if}
		<span class="chev" class:open aria-hidden="true">›</span>
	</button>
	{#if aside}
		<div class="aside">{@render aside()}</div>
	{/if}
	{#if open}
		<section class="body" id="{uid}-body" aria-labelledby="{uid}-label">{@render children()}</section>
	{/if}
</Surface>

<style>
.row {
	display: flex;
	flex-flow: row nowrap;
	align-items: center;
	gap: 12px;
	width: 100%;
	min-height: 44px;
	padding: var(--gap) var(--pad);
	border: 0;
	border-radius: calc(var(--radius-sm) - 2px);
	background: none;
	color: var(--text);
	font: inherit;
	font-family: var(--font-ui);
	text-align: left;
	cursor: pointer;
}

.row:hover {
	background: var(--hover);
}

.row:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}

.label {
	flex: 1;
	min-width: 0;
}

.value {
	color: var(--muted);
	font-size: 0.8125rem;
	text-align: right;
	overflow-wrap: anywhere;
}

.chev {
	color: var(--muted);
	transition: transform 0.15s;
}

.chev.open {
	transform: rotate(90deg);
}

.aside {
	padding: 0 var(--pad) var(--gap);
}

/* The open body, under a dashed divider. */
.body {
	display: flex;
	flex-direction: column;
	gap: var(--gap);
	margin: 0 var(--pad);
	padding: var(--gap) 0 var(--pad);
	border-top: 1px dashed var(--line);
}
</style>
