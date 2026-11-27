<script lang="ts">
import type { HTMLButtonAttributes } from "svelte/elements"

interface Props extends Omit<HTMLButtonAttributes, "class"> {
	/**
	 * Every action is `primary` or `secondary`: `primary` is the one main action of a
	 * group, `secondary` (the default) every action beside it. `danger` deletes;
	 * `ghost` cancels or clears.
	 */
	variant?: "secondary" | "primary" | "danger" | "ghost"
}

let { variant = "secondary", type = "button", children, ...rest }: Props = $props()
</script>

<button {type} class="btn {variant}" {...rest}>{@render children?.()}</button>

<style>
/* A sticker pill: an outline and a hard shadow in the kind's own colour, pressed in on click. */
.btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	min-height: var(--ctl);
	padding: 3px 14px;
	border: var(--border) solid var(--secondary);
	border-radius: var(--radius-ctl);
	background: var(--surface);
	box-shadow: var(--shadow-btn) var(--secondary);
	color: var(--text);
	font-family: var(--font-ui);
	font-size: 13px;
	font-weight: 500;
	cursor: pointer;
	transition:
		transform 80ms,
		box-shadow 80ms,
		background-color 120ms;
}

@media (pointer: coarse) {
	.btn {
		min-height: var(--tap);
	}
}

/* Hover keeps each kind's text readable: an outlined kind tints, a filled kind darkens. */
.secondary:hover:not(:disabled) {
	background: color-mix(in srgb, var(--secondary) 12%, var(--surface));
}

.primary {
	border-color: var(--accent);
	background: var(--accent);
	box-shadow: var(--shadow-btn) var(--accent-deep);
	color: var(--on-accent);
}

.danger {
	border-color: var(--danger);
	background: var(--danger);
	box-shadow: var(--shadow-btn) var(--ink);
	color: var(--on-danger);
}

.primary:hover:not(:disabled),
.danger:hover:not(:disabled) {
	filter: brightness(0.92);
}

.ghost {
	border-color: transparent;
	background: none;
	box-shadow: none;
	color: var(--muted);
}

.ghost:hover:not(:disabled) {
	background: var(--hover);
	color: var(--text);
}

.btn:active:not(:disabled) {
	box-shadow: none;
	transform: translate(2px, 2px);
}

.ghost:active:not(:disabled) {
	transform: none;
}

.btn:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}

.btn:disabled {
	box-shadow: none;
	opacity: 0.5;
	cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
	.btn {
		transition: none;
	}
}
</style>
