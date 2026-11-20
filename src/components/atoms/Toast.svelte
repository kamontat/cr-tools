<script lang="ts">
interface Props {
	message: string | null
	tone: "info" | "warn" | "error"
	ondismiss: () => void
}

let { message, tone, ondismiss }: Props = $props()
</script>

<!-- The region stays in the DOM so a screen reader announces each message as it appears. -->
<div class="host" role={tone === "error" ? "alert" : "status"}>
	{#if message}
		<button type="button" class={tone} onclick={ondismiss}>{message}</button>
	{/if}
</div>

<style>
.host {
	position: fixed;
	left: 50%;
	bottom: calc(24px + env(safe-area-inset-bottom, 0px));
	z-index: 40;
	transform: translateX(-50%);
	max-width: calc(100% - 32px);
	pointer-events: none;
}

button {
	pointer-events: auto;
	padding: 9px 16px;
	border: 0;
	border-radius: 999px;
	background: var(--text);
	color: var(--bg);
	font: inherit;
	font-weight: 600;
	cursor: pointer;
	box-shadow: 0 8px 24px rgb(0 0 0 / 30%);
}

button.warn {
	background: var(--code);
}

button.error {
	background: var(--danger);
	color: #fff;
}
</style>
