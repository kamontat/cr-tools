<script lang="ts">
import { STEP } from "#lib/panel-width"

interface Props {
	/** The handle's name, in the page's language. */
	label: string
	/** The width it sizes now, and its limits. */
	value: number
	min: number
	max: number
	/** A new width while it moves: from a drag, or an arrow key. */
	onresize: (width: number) => void
	/** The width settled: a drag ended, or a key moved it. */
	oncommit: () => void
	/** A double-click: back to the default width. */
	onreset: () => void
	/** The right edge the width is measured from, in viewport pixels. */
	rightEdge: () => number
	/** True while a drag is under way, so the owner can lock the cursor. */
	dragging?: boolean
}

let { label, value, min, max, onresize, oncommit, onreset, rightEdge, dragging = $bindable(false) }: Props = $props()

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
	if (dragging) onresize(rightEdge() - event.clientX)
}

/** Ends a drag wherever the button comes up, or when the handle loses the pointer. */
const onpointerup = () => {
	if (!dragging) return
	dragging = false
	oncommit()
}

const onkeydown = (event: KeyboardEvent) => {
	// The handle is a left edge: left widens, right narrows; Home and End go to the limits.
	const next =
		event.key === "ArrowLeft"
			? value + STEP
			: event.key === "ArrowRight"
				? value - STEP
				: event.key === "End"
					? max
					: event.key === "Home"
						? min
						: null
	if (next === null) return
	event.preventDefault()
	onresize(next)
	oncommit()
}
</script>

<svelte:window {onpointerup} onpointercancel={onpointerup} onblur={onpointerup} />

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<!-- biome-ignore lint/a11y/useSemanticElements: a focusable splitter is a widget; <hr> cannot take focus or keys -->
<div
	class="resize-edge"
	class:dragging
	role="separator"
	aria-orientation="vertical"
	aria-label={label}
	aria-valuemin={min}
	aria-valuemax={max}
	aria-valuenow={value}
	tabindex="0"
	{onpointerdown}
	{onpointermove}
	{onpointerup}
	onpointercancel={onpointerup}
	onlostpointercapture={onpointerup}
	{onkeydown}
	ondblclick={onreset}></div>

<style>
/* A thin strip along a panel's left edge, with a pill that lights up in the accent. */
.resize-edge {
	position: absolute;
	top: 0;
	bottom: 0;
	left: -5px;
	z-index: var(--z-raised);
	width: 10px;
	cursor: ew-resize;
	touch-action: none;
	outline: none;
}

.resize-edge::after {
	content: "";
	position: absolute;
	top: 50%;
	left: 3px;
	width: 4px;
	height: 44px;
	margin-top: -22px;
	border-radius: var(--radius-ctl);
	background: var(--ink);
	opacity: 0.5;
	transition:
		background 0.15s,
		opacity 0.15s;
}

.resize-edge:hover::after,
.resize-edge:focus-visible::after,
.dragging::after {
	background: var(--accent);
	opacity: 1;
}
</style>
