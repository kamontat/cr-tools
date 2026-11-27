<script lang="ts">
import type { Snippet } from "svelte"

import { tick } from "svelte"

import IconButton from "#components/atoms/IconButton.svelte"
import ResizeEdge from "#components/atoms/ResizeEdge.svelte"
import { RAIL_MIN_WIDTH } from "#lib/frame"
import { clampWidth, defaultWidth, MIN_WIDTH, maxRatio, readWidth, writeWidth } from "#lib/panel-width"
import { localStore } from "#lib/storage"

interface Props {
	/**
	 * `panel` (the default): a side panel from the right from 700px, a sheet
	 * from the bottom below it. `dialog`: centred, for an important answer only.
	 */
	kind?: "panel" | "dialog"
	/** Names the remembered width (`frame:panel-width:<id>`) and the title's id. */
	id: string
	title: string
	open: boolean
	onclose: () => void
	children: Snippet
	footer?: Snippet
	/** Buttons in the header, before the close button. */
	actions?: Snippet
	/** The close button's name, in the page's language. */
	closeLabel: string
	/** The side panel's resize edge's name. */
	resizeLabel?: string
	/** The sheet's grab handle's name: it toggles full height. */
	expandLabel?: string
	/** A dialog confirming what cannot be undone: outlined and shadowed in the danger colour. */
	danger?: boolean
	/** A selector for what takes focus on open; the overlay itself by default. */
	focus?: string
}

let {
	kind = "panel",
	id,
	title,
	open,
	onclose,
	children,
	footer,
	actions,
	closeLabel,
	resizeLabel = "",
	expandLabel = "",
	danger = false,
	focus,
}: Props = $props()

const store = localStore()

let viewport = $state(window.innerWidth)
/** The width picked this visit; until then the remembered one or the default. */
let chosen = $state<number | null>(null)
let resizing = $state(false)
/** The sheet stretched to the full screen height. */
let full = $state(false)
/** How far the sheet's handle is dragged down now, for the sheet to follow. */
let pull = $state(0)

const layout = $derived(kind === "dialog" ? "dialog" : viewport >= RAIL_MIN_WIDTH ? "side" : "sheet")
const width = $derived(clampWidth(chosen ?? readWidth(store, id) ?? defaultWidth(id), viewport, id))
const titleId = $derived(`overlay-${id}-title`)

let section = $state<HTMLElement | null>(null)

/** Takes focus on open, and hands it back to what had it on close. */
const take = (node: HTMLElement) => {
	section = node
	const before = document.activeElement instanceof HTMLElement ? document.activeElement : null
	void tick().then(() => {
		const target = focus ? node.querySelector<HTMLElement>(focus) : null
		;(target ?? node).focus()
	})
	return () => {
		section = null
		if (before?.isConnected) before.focus()
	}
}

/** Escape closes, unless a control inside already took it. */
const onkeydown = (event: KeyboardEvent) => {
	if (event.key !== "Escape" || event.defaultPrevented) return
	event.preventDefault()
	onclose()
}

const resize = (next: number) => {
	chosen = clampWidth(next, viewport, id)
}

/* The sheet's handle: a tap toggles full height; a drag up past 70% of the screen snaps to it, one down 100px closes. */
const SNAP_SHARE = 0.7
const CLOSE_PULL = 100
const TAP_SLOP = 6

let dragFrom: number | null = null
/** A drag just ended on the handle, so the click that follows it is not a tap. */
let dragged = false

const ongrabdown = (event: PointerEvent) => {
	if (event.button !== 0) return
	dragFrom = event.clientY
	dragged = false
	try {
		;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
	} catch {
		// Without capture the drag still follows moves over the handle.
	}
}

const ongrabmove = (event: PointerEvent) => {
	if (dragFrom !== null) pull = Math.max(0, event.clientY - dragFrom)
}

const ongrabup = (event: PointerEvent) => {
	if (dragFrom === null) return
	const moved = event.clientY - dragFrom
	dragFrom = null
	pull = 0
	if (Math.abs(moved) < TAP_SLOP) return
	dragged = true
	if (moved >= CLOSE_PULL) onclose()
	else if (event.clientY <= window.innerHeight * (1 - SNAP_SHARE)) full = true
	else if (moved > 0) full = false
}

const ongrabclick = () => {
	if (dragged) {
		dragged = false
		return
	}
	full = !full
}

const ongrabkeydown = (event: KeyboardEvent) => {
	if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return
	event.preventDefault()
	full = event.key === "ArrowUp"
}
</script>

<svelte:window onresize={() => (viewport = window.innerWidth)} />

{#if open}
	<div class="overlay-scrim" aria-hidden="true" onclick={onclose}></div>
	<section
		class="overlay"
		class:danger
		class:full={layout === "sheet" && full}
		class:resizing
		role="dialog"
		aria-modal="true"
		aria-labelledby={titleId}
		data-layout={layout}
		tabindex="-1"
		style:--panel-width={layout === "side" ? `${width}px` : undefined}
		style:--pull={pull > 0 ? `${pull}px` : undefined}
		{onkeydown}
		{@attach take}>
		{#if layout === "sheet"}
			<button
				type="button"
				class="grab"
				aria-label={expandLabel}
				aria-expanded={full}
				onpointerdown={ongrabdown}
				onpointermove={ongrabmove}
				onpointerup={ongrabup}
				onpointercancel={ongrabup}
				onclick={ongrabclick}
				onkeydown={ongrabkeydown}></button>
		{/if}
		<header class="overlay-head">
			<h2 id={titleId}>{title}</h2>
			{#if actions}
				<div row class="overlay-actions">{@render actions()}</div>
			{/if}
			<IconButton label={closeLabel} onclick={onclose}>✕</IconButton>
		</header>
		<div class="overlay-body">{@render children()}</div>
		{#if footer}
			<footer class="overlay-foot">{@render footer()}</footer>
		{/if}
		{#if layout === "side"}
			<ResizeEdge
				label={resizeLabel}
				value={width}
				min={MIN_WIDTH}
				max={Math.round(viewport * maxRatio(id))}
				onresize={resize}
				oncommit={() => writeWidth(store, id, width)}
				onreset={() => {
					chosen = null
					writeWidth(store, id, null)
				}}
				rightEdge={() => section?.getBoundingClientRect().right || viewport}
				bind:dragging={resizing} />
		{/if}
	</section>
{/if}

<style>
.overlay-scrim {
	position: fixed;
	inset: 0;
	z-index: var(--z-sheet);
	background: var(--scrim);
}

/* The one pop-up: a card with the ink outline and the pop shadow, its head, scrolling body and foot. */
.overlay {
	container: overlay / inline-size;
	position: fixed;
	z-index: var(--z-sheet);
	display: flex;
	flex-direction: column;
	border: var(--border) solid var(--ink);
	background: var(--surface);
	box-shadow: var(--shadow-pop);
	color: var(--text);
	outline: none;
}

/* From RAIL_MIN_WIDTH in #lib/frame: full height from the right, as wide as the edge is dragged. */
.overlay[data-layout="side"] {
	top: 0;
	right: 0;
	bottom: 0;
	width: min(var(--panel-width, 460px), 100%);
	border-width: 0 0 0 var(--border);
}

.resizing {
	cursor: ew-resize;
	user-select: none;
}

/* Below RAIL_MIN_WIDTH: from the bottom, up to 85% of the screen, or all of it. */
.overlay[data-layout="sheet"] {
	right: 0;
	bottom: 0;
	left: 0;
	max-height: 85dvh;
	border-width: var(--border) 0 0;
	border-radius: var(--radius) var(--radius) 0 0;
	transform: translateY(var(--pull, 0));
}

.overlay[data-layout="sheet"].full {
	height: 100dvh;
	max-height: 100dvh;
	border-radius: 0;
}

.overlay[data-layout="dialog"] {
	top: 50%;
	left: 50%;
	width: min(420px, calc(100% - 32px));
	max-height: calc(100dvh - 32px);
	border-radius: var(--radius);
	transform: translate(-50%, -50%);
}

.overlay.danger {
	border-color: var(--danger);
	box-shadow: var(--shadow-pop-at) var(--danger);
}

.grab {
	flex: none;
	width: 100%;
	height: 20px;
	padding: 0;
	border: 0;
	background: none;
	cursor: grab;
	touch-action: none;
}

.grab::before {
	content: "";
	display: block;
	width: 36px;
	height: 5px;
	margin: 0 auto;
	border-radius: var(--radius-ctl);
	background: var(--line);
}

.grab:focus-visible {
	outline: none;
}

.grab:focus-visible::before,
.grab:hover::before {
	background: var(--accent);
}

.overlay-head {
	display: flex;
	flex: none;
	align-items: center;
	gap: var(--stack);
	padding: var(--pad) var(--pad) var(--stack) calc(var(--pad) + 4px);
}

.overlay[data-layout="sheet"] .overlay-head {
	padding-top: 0;
}

.overlay-head h2 {
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

.overlay-actions {
	flex: none;
	align-items: center;
	gap: 6px;
}

.overlay-body {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--gap);
	min-height: 0;
	overflow: auto;
	padding: 0 calc(var(--pad) + 4px) var(--pad);
}

.overlay-foot {
	display: flex;
	flex: none;
	align-items: center;
	gap: var(--stack);
	padding: var(--pad) calc(var(--pad) + 4px) calc(var(--pad) + env(safe-area-inset-bottom, 0px));
	border-top: 1px solid var(--line);
}

@media (prefers-reduced-motion: no-preference) {
	.overlay-scrim {
		animation: fade 0.2s ease-out;
	}

	.overlay[data-layout="side"] {
		animation: slide 0.2s ease-out;
	}

	.overlay[data-layout="sheet"] {
		animation: rise 0.22s ease-out;
	}

	.overlay[data-layout="dialog"] {
		animation: fade 0.15s ease-out;
	}
}

@keyframes fade {
	from {
		opacity: 0;
	}
}

@keyframes slide {
	from {
		transform: translateX(30%);
	}
}

@keyframes rise {
	from {
		transform: translateY(30%);
	}
}
</style>
