<script lang="ts">
import type { Snippet } from "svelte"

import { RAIL_MIN_WIDTH } from "#lib/frame"
import { holdFocus, isModalOpen, lockScroll } from "#lib/modal"
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
	/** The close button's name, in the page's language. */
	closeLabel: string
	/** The resize handle's name, in the page's language. */
	resizeLabel: string
	/**
	 * Renders in place as a section beside the page instead of a pop-up: no
	 * scrim, no focus trap, no scroll lock. The caller decides when (the
	 * editor on wide screens); Escape inside still closes it.
	 */
	docked?: boolean
}

let { id, title, open, onclose, children, footer, closeLabel, resizeLabel, docked = false }: Props = $props()

const store = localStore()

let viewport = $state(window.innerWidth)
/** The width picked this visit; until then the remembered one or the default. */
let chosen = $state<number | null>(null)
let dragging = $state(false)

const phone = $derived(viewport < RAIL_MIN_WIDTH)
const width = $derived(clampWidth(chosen ?? readWidth(store, id) ?? defaultWidth(id), viewport, id))
const titleId = $derived(`panel-${id}-title`)

const resize = (next: number) => {
	chosen = clampWidth(next, viewport, id)
}

/** The docked section, whose right edge a drag measures from. */
let section = $state<HTMLElement | null>(null)

/**
 * Moves the pop-up to the end of `<body>`, so one opened from inside another
 * panel (Share over the editor) stacks above it and is not clipped by it.
 * Then it holds focus and closes on Escape — only when it is the topmost
 * pop-up, and not when a control inside already handled the key — and keeps
 * the page behind from scrolling. `onclose` is read when Escape comes, so the
 * attachment never re-runs. Svelte removes the node wherever it sits; the
 * release removes it too.
 */
const popup = (layer: HTMLElement) => {
	const doc = layer.ownerDocument
	doc.body.append(layer)
	const dialog = layer.querySelector<HTMLElement>('[role="dialog"]')
	const release = dialog === null ? () => {} : holdFocus(dialog, () => onclose())
	const unlock = lockScroll(doc)
	return () => {
		release()
		unlock()
		layer.remove()
	}
}

/**
 * The docked panel closes on Escape from inside it, unless a control already
 * handled the key or a pop-up is open over the page. Marking the event
 * handled keeps the frame from also closing the sidebar drawer.
 */
const dock = (node: HTMLElement) => {
	section = node
	const onkeydown = (event: KeyboardEvent) => {
		if (event.key !== "Escape" || event.defaultPrevented || isModalOpen(node.ownerDocument)) return
		event.preventDefault()
		onclose()
	}
	node.addEventListener("keydown", onkeydown)
	return () => {
		node.removeEventListener("keydown", onkeydown)
		section = null
	}
}

/** The panel's right edge: the window's for a pop-up, the section's when docked. */
const rightEdge = () => (docked ? section?.getBoundingClientRect().right || viewport : viewport)

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

{#snippet inside(sheet: boolean)}
	{#if sheet}
		<div class="panel-grab" aria-hidden="true"></div>
	{/if}
	<header class="panel-head">
		<h2 id={titleId}>{title}</h2>
		<button type="button" class="panel-close" aria-label={closeLabel} onclick={onclose}>✕</button>
	</header>
	<div class="panel-body">{@render children()}</div>
	{#if footer}
		<footer class="panel-foot">{@render footer()}</footer>
	{/if}
	{#if !sheet}
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
{/snippet}

{#if open}
	{#if docked}
		<section
			class="panel docked"
			class:resizing={dragging}
			aria-labelledby={titleId}
			data-layout="docked"
			style:--panel-width={`${width}px`}
			{@attach dock}>
			{@render inside(false)}
		</section>
	{:else}
		<div class="panel-layer" class:sheet={phone} class:resizing={dragging} {@attach popup}>
			<!-- A pointer-only way out; Escape and the close button are the keyboard's. -->
			<div
				class="panel-scrim"
				aria-hidden="true"
				onmousedown={(event) => event.preventDefault()}
				onclick={onclose}></div>
			<div
				class="panel"
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				tabindex="-1"
				data-layout={phone ? "sheet" : "side"}
				style:--panel-width={phone ? undefined : `${width}px`}>
				{@render inside(phone)}
			</div>
		</div>
	{/if}
{/if}

<style>
.panel-layer {
	position: fixed;
	inset: 0;
	z-index: var(--z-panel);
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
}

.panel-layer.resizing {
	cursor: ew-resize;
	user-select: none;
}

.panel-scrim {
	position: absolute;
	inset: 0;
	background: rgb(0 0 0 / 50%);
}

.panel {
	position: relative;
	display: flex;
	flex-direction: column;
	width: min(var(--panel-width, 460px), 100%);
	height: 100%;
	background: var(--surface);
	color: var(--text);
	border-left: 1px solid var(--line);
	box-shadow: -12px 0 30px rgb(0 0 0 / 35%);
	outline: none;
	animation: panel-slide 0.2s ease-out;
}

.panel-head {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 12px 10px 20px;
}

.panel-head h2 {
	flex: 1;
	margin: 0;
	font-size: 17px;
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

/* Docked: a column beside the page, not over it. */
.docked {
	flex: none;
	width: min(var(--panel-width, 640px), 100%);
	box-shadow: none;
	animation: none;
}

.docked.resizing {
	cursor: ew-resize;
	user-select: none;
}

/* Phones: a sheet up from the bottom, with a grab handle and no resize. */
.sheet {
	align-items: flex-end;
}

.sheet .panel {
	width: 100%;
	height: auto;
	max-height: 92%;
	border-left: 0;
	border-top: 1px solid var(--line);
	border-radius: 18px 18px 0 0;
	box-shadow: 0 -12px 30px rgb(0 0 0 / 35%);
	padding-bottom: env(safe-area-inset-bottom);
	animation: panel-up 0.22s ease-out;
}

.panel-grab {
	flex: none;
	width: 40px;
	height: 5px;
	margin: 8px auto 0;
	border-radius: 999px;
	background: var(--line);
}

@keyframes panel-slide {
	from {
		transform: translateX(100%);
	}
}

@keyframes panel-up {
	from {
		transform: translateY(100%);
	}
}

@media (prefers-reduced-motion: reduce) {
	.panel,
	.sheet .panel {
		animation: none;
	}
}
</style>
