<script lang="ts">
import type { HTMLButtonAttributes } from "svelte/elements"

interface Props extends Omit<HTMLButtonAttributes, "class"> {
	/** `plain` is the default; `primary` is the one main action of a row; `danger` deletes. */
	variant?: "plain" | "primary" | "danger"
}

let { variant = "plain", type = "button", children, ...rest }: Props = $props()
</script>

<button {type} class="btn {variant}" {...rest}>{@render children?.()}</button>

<style>
.btn {
	min-height: 36px;
	padding: 6px 14px;
	border: 1px solid var(--line);
	border-radius: var(--radius);
	background: var(--surface);
	color: var(--text);
	font: inherit;
	font-weight: 600;
	cursor: pointer;
}

@media (pointer: coarse) {
	.btn {
		min-height: var(--tap);
	}
}

.plain:hover:not(:disabled) {
	background: var(--hover);
}

.primary {
	border-color: var(--accent);
	background: var(--accent);
	color: var(--on-accent);
}

.danger {
	border-color: var(--danger);
	background: var(--danger);
	color: #fff;
}

.btn:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}

.btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}
</style>
