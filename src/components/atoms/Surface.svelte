<script lang="ts">
import type { HTMLAttributes } from "svelte/elements"

interface Props extends HTMLAttributes<HTMLElement> {
	/**
	 * `card` is a sticker: outline and shadow, padded. `sunken` sits into the page
	 * with no shadow. `row` is a list row's sticker, unpadded so its content sets it.
	 */
	kind?: "card" | "sunken" | "row"
	element?: "div" | "section" | "article" | "aside" | "li"
}

let { kind = "card", element = "div", class: extra = "", children, ...rest }: Props = $props()
</script>

<svelte:element this={element} class="surface {kind} {extra}" {...rest}>{@render children?.()}</svelte:element>

<style>
.surface {
	display: flex;
	flex-direction: column;
	border: var(--border) solid var(--ink);
	border-radius: var(--radius);
	background: var(--surface);
}

.card {
	gap: var(--gap);
	padding: var(--pad);
	box-shadow: var(--shadow);
}

.sunken {
	gap: var(--gap);
	padding: var(--pad);
	border-color: var(--line);
	background: var(--surface-2);
}

.row {
	border-radius: var(--radius-sm);
	box-shadow: var(--shadow);
}
</style>
