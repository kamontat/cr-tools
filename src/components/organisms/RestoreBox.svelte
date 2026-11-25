<script lang="ts">
import type { Messages } from "#lib/i18n/messages"

import { readBackup } from "#lib/backup"
import { fetchLink, type LinkFailure, resolveLink } from "#lib/backup-link"
import { readClipboard } from "#lib/clipboard"
import { previewRestore, type RestorePreview } from "#lib/combi/backup"
import { issueText } from "#lib/combi/issues"
import { importSaved, readSaved, type SavedCode } from "#lib/combi/saved"

interface Props {
	store: Storage
	m: Messages
	onrestored: (entries: SavedCode[]) => void
}

let { store, m, onrestored }: Props = $props()

const uid = $props.id()
const t = $derived(m.settings.data)

type Step = "start" | "link" | "paste" | "preview" | "done"

let step = $state<Step>("start")
/** What the paste step holds, and what the link step's field holds. */
let pasted = $state("")
let address = $state("")
/** The text a preview step reads, and the copy's name when a file or link gave it. */
let source = $state<{ text: string; name: string | null }>({ text: "", name: null })
/** A line above the step: why the paste box is showing, or what went wrong. */
let notice = $state<{ text: string; tone: "info" | "error" } | null>(null)
let busy = $state(false)
let done = $state("")
let fileInput = $state<HTMLInputElement>()

const SITES = { gist: "gist", pastefox: "pastefox" } as const

const link = $derived(resolveLink(address))
const view = $derived(step === "paste" ? { text: pasted, name: null } : source)

type Found = { preview: RestorePreview; notBackup: boolean; none: boolean }

/** What a restore of this text would do, and why when there is nothing to do. */
const look = (text: string): Found => {
	const preview = previewRestore(text, readSaved(store))
	const isText = readBackup(text).kind === "text"
	return {
		preview,
		notBackup: preview.newer === undefined && isText && preview.entries.length === 0,
		none: preview.newer === undefined && !isText && preview.entries.length === 0,
	}
}

const found = $derived(step === "preview" || (step === "paste" && pasted.trim() !== "") ? look(view.text) : null)

const reset = () => {
	notice = null
	step = "start"
}

const show = (text: string, name: string | null) => {
	source = { text, name }
	notice = null
	step = "preview"
}

const fromClipboard = async () => {
	busy = true
	const read = await readClipboard()
	busy = false
	if (read.ok) show(read.text, null)
	else {
		notice = { text: read.reason === "missing" ? t.clipboardMissing : t.clipboardRefused, tone: "info" }
		step = "paste"
	}
}

const chooseFile = () => fileInput?.click()

const onfile = async (event: Event) => {
	const input = event.currentTarget as HTMLInputElement
	const file = input.files?.[0]
	if (file === undefined) return
	let text: string
	try {
		text = await file.text()
	} catch {
		notice = { text: t.notBackup, tone: "error" }
		step = "preview"
		source = { text: "", name: file.name }
		return
	}
	input.value = ""
	show(text, file.name)
}

const linkFailure = (failure: LinkFailure): string => {
	const site = failure.platform === null ? "" : t[SITES[failure.platform]]
	const code = failure.status ?? 0
	if (failure.platform === null) {
		return failure.reason === "unreachable" ? t.link.unreachable : t.link.status(code)
	}
	switch (failure.reason) {
		case "missing":
			return t.link.platform.missing(site)
		case "private":
			return t.link.platform.private(site)
		case "unreachable":
			return t.link.platform.unreachable(site)
		default:
			return t.link.platform.status(site, code)
	}
}

const fromLink = async () => {
	if (busy || link === null) return
	busy = true
	notice = null
	const result = await fetchLink(link)
	busy = false
	if (!result.ok) {
		notice = { text: linkFailure(result.failure), tone: "error" }
		return
	}
	if (look(result.text).notBackup) {
		notice = {
			text: link.platform === null ? t.notBackup : t.link.platform.notBackup(t[SITES[link.platform]]),
			tone: "error",
		}
		return
	}
	show(result.text, link.name)
}

const restore = () => {
	if (found === null) return
	const result = importSaved(store, found.preview.entries)
	if (!result.stored) {
		notice = { text: t.notStored, tone: "error" }
		return
	}
	notice = null
	done = t.restored(result.added)
	step = "done"
	onrestored(result.entries)
}

const typed = (event: KeyboardEvent) => {
	if (event.key === "Enter" && link !== null && !busy) {
		event.preventDefault()
		void fromLink()
	}
}
</script>

<section class="restore">
	{#if notice !== null}
		<p class="notice" class:error={notice.tone === "error"} role={notice.tone === "error" ? "alert" : "status"}>
			{notice.text}
		</p>
	{/if}

	{#if step === "start"}
		<div row class="acts">
			<button type="button" class="btn" disabled={busy} onclick={fromClipboard}>{t.fromClipboard}</button>
			<button type="button" class="btn" onclick={chooseFile}>{t.fromFile}</button>
			<button type="button" class="btn" onclick={() => (step = "link")}>{t.fromLink}</button>
			<button type="button" class="btn" onclick={() => (step = "paste")}>{t.byHand}</button>
		</div>
		<input
			bind:this={fileInput}
			type="file"
			id="{uid}-file"
			name="backup-file"
			accept=".json,application/json,.txt,text/plain"
			aria-label={t.fromFile}
			hidden
			onchange={onfile}>
	{:else if step === "link"}
		<label class="field" for="{uid}-link">{t.linkLabel}</label>
		<input
			id="{uid}-link"
			name="backup-link"
			type="text"
			inputmode="url"
			class="input"
			autocomplete="off"
			autocapitalize="off"
			spellcheck="false"
			placeholder="https://"
			bind:value={address}
			onkeydown={typed}>
		<p class="hint">
			{t.linkHint}
			<a href="https://gist.github.com/" target="_blank" rel="noopener">{t.gist}</a>,
			<a href="https://pastefox.com/create" target="_blank" rel="noopener">{t.pastefox}</a>.
		</p>
		<div row class="acts">
			<button type="button" class="btn" onclick={reset}>{t.back}</button>
			<button type="button" class="btn primary" disabled={link === null || busy} onclick={fromLink}>
				{t.restoreButton}
			</button>
		</div>
		{#if address.trim() !== "" && link === null}
			<p class="hint">{t.link.notAddress}</p>
		{/if}
	{:else if step === "paste"}
		<label class="field" for="{uid}-paste">{t.pasteLabel}</label>
		<textarea
			id="{uid}-paste"
			name="backup-paste"
			class="input text"
			rows="8"
			spellcheck="false"
			bind:value={pasted}></textarea>
		<div row class="acts">
			<button type="button" class="btn" onclick={reset}>{t.back}</button>
		</div>
	{:else if step === "done"}
		<p class="notice" role="status">{done}</p>
		<div row class="acts">
			<button type="button" class="btn" onclick={reset}>{t.back}</button>
		</div>
	{/if}

	{#if found !== null && (step === "preview" || step === "paste")}
		<section class="preview" aria-label={t.restore}>
			{#if found.preview.newer !== undefined}
				<p class="notice error">{t.newer(found.preview.newer)}</p>
			{:else if found.notBackup}
				<p class="notice error">{t.notBackup}</p>
			{:else}
				<p class="notice" role="status">
					{t.found(found.preview.entries.length, found.preview.fresh, found.preview.kept)}{view.name === null
						? ""
						: ` ${t.foundIn(view.name)}`}
				</p>
				{#if found.none && found.preview.skipped.length === 0}
					<p class="hint">{t.foundNone}</p>
				{/if}
				{#if found.preview.skipped.length > 0}
					<p class="hint">{t.skipped(found.preview.skipped.length)}</p>
					<ul class="skipped">
						{#each found.preview.skipped as skip (`${skip.line}:${skip.text}`)}
							<li><code>{skip.text}</code> {issueText(skip.reason, m)}</li>
						{/each}
					</ul>
				{/if}
			{/if}
			<div row class="acts">
				{#if step === "preview"}
					<button type="button" class="btn" onclick={reset}>{t.back}</button>
				{/if}
				{#if found.preview.fresh > 0}
					<button type="button" class="btn primary" onclick={restore}>{t.restoreButton}</button>
				{/if}
			</div>
		</section>
	{/if}
</section>

<style>
/* Sections, not divs: the reset lays out only divs as columns, so these say it themselves. */
.restore,
.preview {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.notice,
.hint {
	margin: 0;
	overflow-wrap: anywhere;
}

.hint {
	color: var(--muted);
	font-size: 0.8125rem;
}

.notice.error {
	color: var(--danger);
}

.field {
	font-weight: 600;
}

.input {
	width: 100%;
	padding: 8px 10px;
	border: 1px solid var(--line);
	border-radius: var(--radius);
	background: var(--surface);
	color: var(--text);
	font: inherit;
}

.text {
	font-family: var(--mono);
	font-size: 0.8125rem;
	resize: vertical;
}

.skipped {
	margin: 0;
	padding-left: 1.25rem;
	font-size: 0.8125rem;
	overflow-wrap: anywhere;
}

a {
	color: var(--accent);
}

.acts {
	flex-wrap: wrap;
	gap: 8px;
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

.btn:hover:not(:disabled) {
	background: var(--hover);
}

.btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn.primary {
	border-color: var(--accent);
	background: var(--accent);
	color: var(--on-accent);
}
</style>
