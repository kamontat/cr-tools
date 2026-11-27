<script lang="ts">
import type { Snippet } from "svelte"

import IconButton from "#components/atoms/IconButton.svelte"
import ResizeEdge from "#components/atoms/ResizeEdge.svelte"
import { clampWidth, defaultWidth, MIN_WIDTH, maxRatio, readWidth, writeWidth } from "#lib/panel-width"
import { localStore } from "#lib/storage"

interface Props {
	/** Names the remembered width (`frame:panel-width:<id>`) and the title's id. */
	id: string
	title: string
	open: boolean
	onclose: () => void
	children: Snippet
	footer?: Snippet
	/** Buttons in the header, top right, before the close button. */
	actions?: Snippet
	/** The close button's name, in the page's language. */
	closeLabel: string
	/** The resize handle's name, in the page's language. */
	resizeLabel: string
	/**
	 * The page's own view, in place of what it opened from: the close button
	 * is a back arrow leading the header, and the width is the page's, so
	 * nothing resizes.
	 */
	back?: boolean
}

let { id, title, open, onclose, children, footer, actions, closeLabel, resizeLabel, back = false }: Props = $props()

const store = localStore()

let viewport = $state(window.innerWidth)
/** The width picked this visit; until then the remembered one or the default. */
let chosen = $state<number | null>(null)
let dragging = $state(false)

const width = $derived(clampWidth(chosen ?? readWidth(store, id) ?? defaultWidth(id), viewport, id))
const titleId = $derived(`panel-${id}-title`)

const resize = (next: number) => {
	chosen = clampWidth(next, viewport, id)
}

/** The section, whose right edge a drag measures from. */
let section = $state<HTMLElement | null>(null)

/**
 * The panel closes on Escape from inside it, unless a control already
 * handled the key. Marking the event handled keeps the frame from also
 * closing the sidebar drawer.
 */
const dock = (node: HTMLElement) => {
	section = node
	const onkeydown = (event: KeyboardEvent) => {
		if (event.key !== "Escape" || event.defaultPrevented) return
		event.preventDefault()
		onclose()
	}
	node.addEventListener("keydown", onkeydown)
	return () => {
		node.removeEventListener("keydown", onkeydown)
		section = null
	}
}

/** The panel's right edge, which a drag measures from. */
const rightEdge = () => section?.getBoundingClientRect().right || viewport

const reset = () => {
	chosen = null
	writeWidth(store, id, null)
}
</script>

<svelte:window onresize={() => (viewport = window.innerWidth)} />

{#if open}
	<section
		class="panel docked"
		class:resizing={dragging}
		aria-labelledby={titleId}
		data-layout={back ? "view" : "docked"}
		style:--panel-width={back ? undefined : `${width}px`}
		{@attach dock}>
		<header class="panel-head">
			{#if back}
				<IconButton label={closeLabel} onclick={onclose}>←</IconButton>
			{/if}
			<h2 id={titleId}>{title}</h2>
			{#if actions}
				<div row class="panel-actions">{@render actions()}</div>
			{/if}
			{#if !back}
				<IconButton label={closeLabel} onclick={onclose}>✕</IconButton>
			{/if}
		</header>
		<div class="panel-body">{@render children()}</div>
		{#if footer}
			<footer class="panel-foot">{@render footer()}</footer>
		{/if}
		{#if !back}
			<ResizeEdge
				label={resizeLabel}
				value={width}
				min={MIN_WIDTH}
				max={Math.round(viewport * maxRatio(id))}
				onresize={resize}
				oncommit={() => writeWidth(store, id, width)}
				onreset={reset}
				{rightEdge}
				bind:dragging />
		{/if}
	</section>
{/if}

<style>
/* A column beside the page, not over it, with Overlay's head, body and foot. */
.panel {
	container: panel / inline-size;
	position: relative;
	display: flex;
	flex: none;
	flex-direction: column;
	width: min(var(--panel-width, 640px), 100%);
	height: 100%;
	background: var(--surface);
	color: var(--text);
	border-left: var(--border) solid var(--ink);
	outline: none;
}

/* Below the dock breakpoint the editor is the page, as wide as it. */
.panel[data-layout="view"] {
	width: 100%;
	border-left: 0;
}

.panel.resizing {
	cursor: ew-resize;
	user-select: none;
}

.panel-head {
	display: flex;
	flex: none;
	align-items: center;
	gap: var(--stack);
	padding: var(--pad) var(--pad) var(--stack) calc(var(--pad) + 4px);
}

.panel-head h2 {
	flex: 1;
	min-width: 0;
	margin: 0;
	overflow: hidden;
	font-family: var(--font-head);
	font-size: 16px;
	font-weight: 600;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.panel-actions {
	flex: none;
	align-items: center;
	gap: 6px;
}

.panel-body {
	flex: 1;
	min-height: 0;
	overflow: auto;
	gap: var(--gap);
	padding: 0 calc(var(--pad) + 4px) var(--pad);
}

.panel-foot {
	display: flex;
	flex: none;
	align-items: center;
	gap: var(--stack);
	padding: var(--pad) calc(var(--pad) + 4px);
	border-top: 1px solid var(--line);
}

/* A view's arrow sits at the header's start. */
[data-layout="view"] .panel-head {
	padding-left: var(--pad);
}

/* A narrow panel, such as the editor on a phone: the title keeps its line with ← or ✕, and the actions take the row under it. */
@container panel (max-width: 560px) {
	.panel-head {
		flex-wrap: wrap;
	}

	.panel-head > :global(.icon-btn) {
		order: 2;
	}

	.panel-actions {
		order: 3;
		flex-basis: 100%;
		justify-content: flex-end;
	}

	[data-layout="view"] .panel-head > :global(.icon-btn) {
		order: 0;
	}
}
</style>
