<script lang="ts">
import { topModal } from "#lib/modal"

interface Props {
	message: string | null
	tone: "info" | "warn" | "error"
	ondismiss: () => void
}

let { message, tone, ondismiss }: Props = $props()

/**
 * Keeps the notice where it is seen and heard: inside the topmost open pop-up
 * while one is open — `aria-modal` hides everything outside it from a screen
 * reader, and it is drawn over the page — else at the end of `<body>`, above
 * the frame. Pop-ups come and go as children of `<body>`, so watching its
 * children is enough to follow them. A pop-up that closes takes the notice out
 * with it, still inside, and the notice comes back; one removed on its own (by
 * Svelte, wherever it sits) stays out.
 */
const float = (node: HTMLElement) => {
	const doc = node.ownerDocument
	let live = true
	const place = () => {
		if (!live || node.parentNode === null) return
		const dialog = topModal(doc)
		const home = dialog ?? doc.body
		if (node.parentNode !== home) home.append(node)
		node.toggleAttribute("data-in-dialog", dialog !== null)
	}
	place()
	const watch = new MutationObserver(place)
	watch.observe(doc.body, { childList: true })
	return () => {
		live = false
		watch.disconnect()
	}
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

/* Inside a pop-up: centred on it rather than on the window, and clear of a footer row of buttons. */
/* The attribute is set by `float`, not the template, so Svelte must not prune the selector. */
.toast:global([data-in-dialog]) .host {
	position: absolute;
	bottom: calc(88px + env(safe-area-inset-bottom, 0px));
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
	color: #fff;
}
</style>
