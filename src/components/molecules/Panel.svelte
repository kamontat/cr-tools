<script lang="ts">
import type { Snippet } from "svelte"

import { clampWidth, defaultWidth, MIN_WIDTH, maxRatio, readWidth, STEP, writeWidth } from "#lib/panel-width"
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

const onpointerdown = (event: PointerEvent) => {
	if (event.button !== 0) return
	event.preventDefault()
	dragging = true
	try {
		;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
	} catch {
		// Without capture the drag still follows moves over the handle.
	}
}

const onpointermove = (event: PointerEvent) => {
	// The handle is the left edge, so the width is the distance to the right one.
	if (dragging) resize(rightEdge() - event.clientX)
}

/** Ends a drag wherever the button comes up, or when the handle loses the pointer. */
const onpointerup = () => {
	if (!dragging) return
	dragging = false
	writeWidth(store, id, width)
}

const onseparatorkeydown = (event: KeyboardEvent) => {
	// The handle is the panel's left edge: left widens, right narrows.
	const delta = event.key === "ArrowLeft" ? STEP : event.key === "ArrowRight" ? -STEP : 0
	if (delta === 0) return
	event.preventDefault()
	resize(width + delta)
	writeWidth(store, id, width)
}

const ondblclick = () => {
	chosen = null
	writeWidth(store, id, null)
}
</script>

<svelte:window
	onresize={() => (viewport = window.innerWidth)}
	{onpointerup}
	onpointercancel={onpointerup}
	onblur={onpointerup} />

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
				<button type="button" class="panel-close panel-back" aria-label={closeLabel} onclick={onclose}>←</button>
			{/if}
			<h2 id={titleId}>{title}</h2>
			{#if actions}
				<div row class="panel-actions">{@render actions()}</div>
			{/if}
			{#if !back}
				<button type="button" class="panel-close" aria-label={closeLabel} onclick={onclose}>✕</button>
			{/if}
		</header>
		<div class="panel-body">{@render children()}</div>
		{#if footer}
			<footer class="panel-foot">{@render footer()}</footer>
		{/if}
		{#if !back}
			<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
			<!-- biome-ignore lint/a11y/useSemanticElements: a focusable splitter is a widget; <hr> cannot take focus or keys -->
			<div
				class="panel-resize"
				role="separator"
				aria-orientation="vertical"
				aria-label={resizeLabel}
				aria-valuemin={MIN_WIDTH}
				aria-valuemax={Math.round(viewport * maxRatio(id))}
				aria-valuenow={width}
				tabindex="0"
				{onpointerdown}
				{onpointermove}
				{onpointerup}
				onpointercancel={onpointerup}
				onlostpointercapture={onpointerup}
				onkeydown={onseparatorkeydown}
				{ondblclick}></div>
		{/if}
	</section>
{/if}

<style>
/* A column beside the page, not over it. */
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
	border-left: 1px solid var(--line);
	outline: none;
}

.panel.resizing {
	cursor: ew-resize;
	user-select: none;
}

.panel-head {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 12px 10px 20px;
}

.panel-head h2 {
	flex: 1;
	min-width: 0;
	margin: 0;
	overflow: hidden;
	font-size: 17px;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.panel-actions {
	flex: none;
	align-items: center;
	gap: 6px;
}

.panel-close {
	display: grid;
	place-items: center;
	flex: none;
	width: var(--tap);
	height: var(--tap);
	border: 0;
	border-radius: var(--radius);
	background: none;
	color: var(--muted);
	font-size: 18px;
	cursor: pointer;
}

.panel-close:hover {
	background: var(--hover);
	color: var(--text);
}

.panel-body {
	flex: 1;
	min-height: 0;
	overflow: auto;
	gap: 14px;
	padding: 0 20px 24px;
}

.panel-foot {
	display: flex;
	gap: 8px;
	padding: 12px 20px;
	border-top: 1px solid var(--line);
}

.panel-resize {
	position: absolute;
	top: 0;
	bottom: 0;
	left: -5px;
	z-index: 1;
	width: 10px;
	cursor: ew-resize;
	touch-action: none;
	outline: none;
}

.panel-resize::after {
	content: "";
	position: absolute;
	top: 50%;
	left: 3px;
	width: 4px;
	height: 44px;
	margin-top: -22px;
	border-radius: 999px;
	background: var(--line);
	transition: background 0.15s;
}

.panel-resize:hover::after,
.panel-resize:focus-visible::after,
.resizing .panel-resize::after {
	background: var(--accent);
}

/* A view's arrow sits at the header's start. */
.panel-back {
	margin: 0 4px 0 -6px;
}

/* A narrow panel, such as the editor on a phone: the title keeps its line with ← or ✕, and the actions take the row under it. */
@container panel (max-width: 560px) {
	.panel-head {
		flex-wrap: wrap;
	}

	.panel-close {
		order: 2;
	}

	.panel-actions {
		order: 3;
		flex-basis: 100%;
		justify-content: flex-end;
	}

	.panel-back {
		order: 0;
	}
}
</style>
