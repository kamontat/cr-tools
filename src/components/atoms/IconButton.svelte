<script lang="ts">
import type { HTMLButtonAttributes } from "svelte/elements"

interface Props extends Omit<HTMLButtonAttributes, "class" | "aria-label"> {
	/** The button's name: an icon alone names nothing. */
	label: string
}

let { label, type = "button", children, ...rest }: Props = $props()
</script>

<button {type} class="icon-btn" aria-label={label} {...rest}>{@render children?.()}</button>

<style>
/* A square, quiet button for close, back and more: no outline until hovered. */
.icon-btn {
	display: inline-grid;
	flex: none;
	place-items: center;
	width: 2rem;
	height: 2rem;
	padding: 0;
	border: 0;
	border-radius: var(--radius-sm);
	background: none;
	color: var(--muted);
	font: inherit;
	font-size: 18px;
	line-height: 1;
	cursor: pointer;
}

@media (pointer: coarse) {
	.icon-btn {
		width: var(--tap);
		height: var(--tap);
	}
}

.icon-btn:hover:not(:disabled) {
	background: var(--hover);
	color: var(--text);
}

.icon-btn:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}

.icon-btn:disabled {
	opacity: 0.45;
	cursor: not-allowed;
}
</style>
