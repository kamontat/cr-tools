<script lang="ts">
interface Props {
	message: string | null
	tone: "info" | "warn" | "error"
	ondismiss: () => void
}

let { message, tone, ondismiss }: Props = $props()

/**
 * Keeps the notice at the end of `<body>`, above the frame, wherever the page
 * that renders it sits. Svelte removes the node wherever it is.
 */
const float = (node: HTMLElement) => {
	node.ownerDocument.body.append(node)
}
</script>

<div class="toast" {@attach float}>
	<!-- Both regions stay in the DOM, and the message goes in the one that matches the tone, so a screen reader announces it as it appears. -->
	<div class="host" role="status">
		{#if message && tone !== "error"}
			<button type="button" class={tone} onclick={ondismiss}>{message}</button>
		{/if}
	</div>
	<div class="host" role="alert">
		{#if message && tone === "error"}
			<button type="button" class={tone} onclick={ondismiss}>{message}</button>
		{/if}
	</div>
</div>

<style>
.toast {
	display: contents;
}

.host {
	position: fixed;
	left: 50%;
	bottom: calc(24px + env(safe-area-inset-bottom, 0px));
	z-index: var(--z-toast);
	transform: translateX(-50%);
	max-width: calc(100% - 32px);
	pointer-events: none;
}

/* A sticker note: yellow with an ink outline and shadow; a warning is plain, an error red. */
button {
	pointer-events: auto;
	min-height: 34px;
	padding: 6px 14px;
	border: var(--border) solid var(--ink);
	border-radius: var(--radius-ctl);
	background: var(--pick);
	box-shadow: var(--shadow-pop);
	color: var(--on-pick);
	font-family: var(--font-ui);
	font-size: 13px;
	font-weight: 500;
	cursor: pointer;
}

@media (pointer: coarse) {
	button {
		min-height: var(--tap);
	}
}

button:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}

button.warn {
	background: var(--surface);
	color: var(--text);
}

button.error {
	border-color: var(--danger);
	background: var(--danger);
	color: var(--on-danger);
}
</style>
