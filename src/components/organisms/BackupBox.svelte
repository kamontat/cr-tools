<script lang="ts">
import type { SavedCode } from "#lib/combi/saved"
import type { Messages } from "#lib/i18n/messages"

import { onDestroy } from "svelte"

import Toast from "#components/atoms/Toast.svelte"
import { backupFileName, writeBackup } from "#lib/backup"
import { copyText } from "#lib/clipboard"
import { exportCodes } from "#lib/combi/backup"
import { downloadText } from "#lib/download"

interface Props {
	entries: readonly SavedCode[]
	m: Messages
}

let { entries, m }: Props = $props()

const uid = $props.id()
const t = $derived(m.settings.data)

const fileText = (now: Date) => writeBackup({ "combi-codes": exportCodes(entries) }, now)

const shownName = $derived(backupFileName(new Date()))

let text = $state<string | null>(null)
let toast = $state<{ message: string; tone: "info" | "error" } | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
let box = $state<HTMLTextAreaElement>()

const say = (message: string, tone: "info" | "error") => {
	toast = { message, tone }
	clearTimeout(timer)
	timer = setTimeout(() => (toast = null), 4000)
}

onDestroy(() => clearTimeout(timer))

const download = () => {
	const now = new Date()
	if (!downloadText(backupFileName(now), fileText(now))) say(t.downloadFailed, "error")
}

const toggleText = () => {
	text = text === null ? fileText(new Date()) : null
}

const copy = async () => {
	if (text === null) return
	if (await copyText(text)) say(t.copied, "info")
	else {
		box?.select()
		say(t.copyFailed, "error")
	}
}
</script>

{#if entries.length === 0}
	<p class="empty">{t.nothingSaved}</p>
{:else}
	<div class="rows">
		<div row class="line">
			<span class="what">{t.fileName(shownName)}</span>
			<button type="button" class="btn primary" onclick={download}>{t.download}</button>
		</div>
		<div row class="line">
			<span class="what">{t.asText}</span>
			<button
				type="button"
				class="btn"
				aria-expanded={text !== null}
				aria-controls={text !== null ? `${uid}-text` : undefined}
				onclick={toggleText}>
				{t.asText}
			</button>
		</div>
		{#if text !== null}
			<textarea
				id="{uid}-text"
				name="backup-text"
				class="text"
				readonly
				rows="8"
				aria-label={t.asText}
				value={text}
				bind:this={box}></textarea>
			<div row class="acts">
				<button type="button" class="btn primary" onclick={copy}>{t.copy}</button>
			</div>
		{/if}
	</div>
{/if}
<Toast message={toast?.message ?? null} tone={toast?.tone ?? "info"} ondismiss={() => (toast = null)} />

<style>
.rows {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.empty {
	margin: 0;
	color: var(--muted);
}

.line {
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.what {
	min-width: 0;
	overflow-wrap: anywhere;
}

.acts {
	flex-wrap: wrap;
	gap: 8px;
}

.text {
	width: 100%;
	padding: 10px;
	border: 1px solid var(--line);
	border-radius: var(--radius);
	background: var(--hover);
	color: var(--text);
	font-family: var(--mono);
	font-size: 0.8125rem;
	resize: vertical;
}

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

.btn:hover {
	background: var(--hover);
}

.btn.primary {
	border-color: var(--accent);
	background: var(--accent);
	color: var(--on-accent);
}
</style>
