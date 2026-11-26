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

button {
	pointer-events: auto;
	min-height: 40px;
	padding: 9px 16px;
	border: 1px solid var(--line);
	border-radius: 999px;
	background: var(--text);
	color: var(--bg);
	font: inherit;
	font-weight: 600;
	cursor: pointer;
}

@media (pointer: coarse) {
	button {
		min-height: var(--tap);
	}
}

button.warn {
	background: var(--code);
}

button.error {
	background: var(--danger);
	color: var(--on-danger);
}
</style>
