<script lang="ts">
import type { Snippet } from "svelte"

import { RAIL_MIN_WIDTH } from "#lib/frame"
import { holdFocus } from "#lib/modal"
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
	closeLabel?: string
	resizeLabel?: string
}

let { id, title, open, onclose, children, footer, closeLabel = "Close", resizeLabel = "Resize panel" }: Props = $props()

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

/**
 * Holds focus while open and closes on Escape — only when this is the
 * topmost pop-up, and not when a control inside already handled the key.
 * `onclose` is read when Escape comes, so the attachment never re-runs.
 */
const modal = (node: HTMLElement) => holdFocus(node, () => onclose())

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
	// The panel's right edge is the window's, so its width is the distance to it.
	if (dragging) resize(viewport - event.clientX)
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
	<div class="panel-layer" class:sheet={phone} class:resizing={dragging}>
		<!-- A pointer-only way out; Escape and the close button are the keyboard's. -->
		<div class="panel-scrim" aria-hidden="true" onmousedown={(event) => event.preventDefault()} onclick={onclose}></div>
		<div
			class="panel"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			tabindex="-1"
			data-layout={phone ? "sheet" : "side"}
			style:--panel-width={phone ? undefined : `${width}px`}
			{@attach modal}>
			{#if phone}
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
			{#if !phone}
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
		</div>
	</div>
{/if}

<style>
.panel-layer {
	position: fixed;
	inset: 0;
	z-index: 40;
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
