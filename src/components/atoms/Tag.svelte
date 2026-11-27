<script lang="ts">
import type { Snippet } from "svelte"

interface Props {
	/** `muted` is the default; `outlined` and `filled` stand out more, most important first. */
	tone?: "muted" | "outlined" | "filled"
	children: Snippet
}

let { tone = "muted", children }: Props = $props()
</script>

<span class="tag {tone}">{@render children()}</span>

<style>
/* A small pill for what a row is: its mode, episode, goal. */
.tag {
	display: inline-flex;
	align-items: center;
	padding: 0 7px;
	border: 1px solid var(--line);
	border-radius: var(--radius-ctl);
	background: var(--surface-2);
	color: var(--muted);
	font-family: var(--font-ui);
	font-size: 11px;
	line-height: 18px;
	white-space: nowrap;
}

.outlined {
	border-color: var(--ink);
	background: none;
	color: var(--text);
}

.filled {
	border-color: var(--text);
	background: var(--text);
	color: var(--bg);
}
</style>
