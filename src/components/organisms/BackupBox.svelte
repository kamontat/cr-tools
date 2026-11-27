<script lang="ts">
import type { SavedCode } from "#lib/combi/saved"
import type { Messages } from "#lib/i18n/messages"

import Button from "#components/atoms/Button.svelte"
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

let open = $state(false)
const text = $derived(open ? fileText(new Date()) : null)
let notice = $state<{ message: string; tone: "info" | "error" } | null>(null)
let box = $state<HTMLTextAreaElement>()

const say = (message: string, tone: "info" | "error") => {
	notice = { message, tone }
}

const download = () => {
	const now = new Date()
	if (!downloadText(backupFileName(now), fileText(now))) say(t.downloadFailed, "error")
}

const toggleText = () => {
	open = !open
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
			<Button variant="primary" onclick={download}>{t.download}</Button>
		</div>
		<div row class="line">
			<Button
				aria-expanded={text !== null}
				aria-controls={text !== null ? `${uid}-text` : undefined}
				onclick={toggleText}>
				{t.asText}
			</Button>
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
				<Button variant="primary" onclick={copy}>{t.copy}</Button>
			</div>
		{/if}
		{#if notice !== null}
			<p class="notice" class:error={notice.tone === "error"} role={notice.tone === "error" ? "alert" : "status"}>
				{notice.message}
			</p>
		{/if}
	</div>
{/if}

<style>
.rows {
	display: flex;
	flex-direction: column;
	gap: var(--gap);
}

.notice {
	margin: 0;
}

.notice.error {
	color: var(--danger);
}

.empty {
	margin: 0;
	color: var(--muted);
}

.line {
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--stack);
}

.what {
	min-width: 0;
	overflow-wrap: anywhere;
}

.acts {
	flex-wrap: wrap;
	gap: var(--stack);
}

.text {
	width: 100%;
	padding: var(--gap);
	border: var(--border) solid var(--line);
	border-radius: var(--radius-sm);
	background: var(--surface-2);
	color: var(--text);
	font-family: var(--mono);
	font-size: 0.8125rem;
	resize: vertical;
}

.text:focus-visible {
	outline: 3px solid color-mix(in srgb, var(--accent) 40%, transparent);
	border-color: var(--accent);
}
</style>
