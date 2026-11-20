<script lang="ts">
import type { Draft } from "#lib/combi/draft"
import type { Issue } from "#lib/combi/issues"
import type { RunStats } from "#lib/combi/stats"

import { onDestroy, onMount } from "svelte"

import Toast from "#components/atoms/Toast.svelte"
import CombiEditor from "#components/organisms/CombiEditor.svelte"
import CombiList from "#components/organisms/CombiList.svelte"
import ShareDialog from "#components/organisms/ShareDialog.svelte"
import { codeOf, draftFrom, draftFromCode, isDirty, newDraft } from "#lib/combi/draft"
import { combiSectionOf } from "#lib/combi/full-code"
import { CodeError, issueText } from "#lib/combi/issues"
import {
	cleanDescription,
	descriptionTitle,
	readSaved,
	removeSaved,
	type SavedCode,
	saveCode,
	updateSaved,
} from "#lib/combi/saved"
import { codeInHash, hashFor, noteInHash, shareHashFor, statsInHash } from "#lib/combi/state"
import { isEmptyStats } from "#lib/combi/stats"
import { DOCK_MIN_WIDTH } from "#lib/frame"
import { messagesFor } from "#lib/i18n/messages"
import { currentLang, type Lang, onLangChange } from "#lib/lang"
import { isModalOpen } from "#lib/modal"
import { localStore } from "#lib/storage"

let lang = $state<Lang>(currentLang(document))
const m = $derived(messagesFor(lang))

$effect(() => onLangChange(document, (next) => (lang = next)))

/** Stands in for a browser that keeps nothing, so the list still works for this visit. */
function memoryStore(): Storage {
	const items = new Map<string, string>()
	return {
		get length() {
			return items.size
		},
		clear: () => items.clear(),
		getItem: (key) => items.get(key) ?? null,
		key: (index) => [...items.keys()][index] ?? null,
		removeItem: (key) => void items.delete(key),
		setItem: (key, value) => void items.set(key, String(value)),
	}
}

const persistent = localStore()
const store = persistent ?? memoryStore()

let entries = $state<SavedCode[]>(readSaved(store))
/** The build in the editor; the editor is open while there is one. */
let draft = $state.raw<Draft | null>(null)
let share = $state<{ code: string; note: string; stats: RunStats } | null>(null)

let width = $state(window.innerWidth)
const docked = $derived(width >= DOCK_MIN_WIDTH)

/**
 * The draft as it was last opened or saved, to tell an edit from none: a paste
 * never replaces edits nobody has kept.
 */
let baseline = $state.raw<Draft | null>(null)
/** A link's draft whose note or stats are offered and not yet kept; the address bar keeps carrying them. */
let offered = $state.raw<Draft | null>(null)

/** The entry the draft was opened from, while it is still in the list. */
const saved = $derived(draft?.from == null ? null : (entries.find((entry) => entry.code === draft?.from) ?? null))

// --- Notices -----------------------------------------------------------------

type Tone = "info" | "warn" | "error"
let notice = $state<{ message: string; tone: Tone } | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

const say = (message: string, tone: Tone = "info") => {
	notice = { message, tone }
	clearTimeout(timer)
	timer = setTimeout(() => (notice = null), tone === "info" ? 4000 : 8000)
}

const dismiss = () => {
	clearTimeout(timer)
	notice = null
}

onDestroy(() => clearTimeout(timer))

/** What a saved entry is called in a sentence: its note's first line, else its 10 characters. */
const nameOf = (entry: SavedCode) => descriptionTitle(entry.description) || combiSectionOf(entry.code)

const why = (error: unknown) => (error instanceof CodeError ? issueText(error.issue, m) : m.combi.notices.unreadable)

/** A code read with changes says so, with each change and anything else worth a word after them. */
const sayChanges = (warnings: readonly Issue[], after?: string) => {
	const lines = [...warnings.map((warning) => issueText(warning, m)), ...(after === undefined ? [] : [after])]
	say(`${m.combi.notices.readWithChanges}: ${lines.join(". ")}`, "warn")
}

/** Opens a draft, saying what changed in reading it, or `sentence` when nothing did. */
const openDraft = (next: Draft, warnings: readonly Issue[], sentence?: string) => {
	draft = next
	baseline = next
	offered = null
	if (warnings.length > 0) sayChanges(warnings, sentence)
	else if (sentence !== undefined) say(sentence)
}

/** The saved entry a code already is, by the code it encodes to. */
const savedAs = (code: string) => entries.find((entry) => entry.code === code)

// --- Opening -----------------------------------------------------------------

const openNew = () => {
	openDraft(newDraft(), [])
}

const openEntry = (entry: SavedCode, sentence?: string) => {
	try {
		const { draft: next, warnings } = draftFrom(entry)
		openDraft(next, warnings, sentence)
	} catch (error) {
		say(m.combi.notices.noLongerReads(combiSectionOf(entry.code), why(error)), "error")
	}
}

/**
 * A link may carry a note and run stats. They are offered, not saved: they go
 * into the editor, and keeping them is one press of Save. A code already saved
 * opens that entry instead, so Save cannot list it twice.
 */
const openLink = (hash: string) => {
	const code = codeInHash(hash)
	if (code === null) return
	const note = noteInHash(hash)
	const stats = statsInHash(hash)
	const carried = note !== null || !isEmptyStats(stats)
	if (draft !== null && !carried && codeOf(draft) === code) return

	let read: ReturnType<typeof draftFromCode>
	try {
		read = draftFromCode(code, note ?? "", stats)
	} catch (error) {
		say(m.combi.notices.linkUnreadable(code, why(error)), "error")
		return
	}

	const entry = savedAs(codeOf(read.draft))
	if (entry !== undefined) {
		// Only a note or stats the entry would not take are worth a word.
		openEntry(entry, carried ? m.combi.notices.linkSaved(nameOf(entry)) : undefined)
		return
	}
	const t = m.combi.notices
	const sentence = !carried ? undefined : note === null ? t.linkStats : isEmptyStats(stats) ? t.linkNote : t.linkBoth
	openDraft(read.draft, read.warnings, sentence)
	if (carried) offered = read.draft
}

/** The hash this page last wrote, so a `hashchange` back to it is not a new link. */
let written = ""

const onhashchange = () => {
	if (location.hash === written) return
	openLink(location.hash)
}

onMount(() => openLink(location.hash))

// The address bar names the code in the editor, so a reload or a copied URL
// opens it again; closing the editor clears it. A link's note and stats stay
// in it until they are saved or edited, so a reload before Save keeps the offer.
let wasOpen = false
$effect(() => {
	if (draft !== null) {
		const hash =
			offered !== null && draft === offered
				? shareHashFor(codeOf(draft), draft.note, draft.stats)
				: hashFor(codeOf(draft))
		history.replaceState(null, "", hash)
		written = location.hash
		wasOpen = true
	} else if (wasOpen) {
		history.replaceState(null, "", location.pathname)
		written = ""
		wasOpen = false
	}
})

/** Whether the open draft holds edits since it was opened or last saved. */
const hasEdits = () => {
	if (draft === null || baseline === null || draft === baseline) return false
	const kept: SavedCode = saved ?? {
		code: codeOf(baseline),
		description: cleanDescription(baseline.note),
		...(isEmptyStats(baseline.stats) ? {} : { stats: baseline.stats }),
		savedAt: 0,
	}
	return isDirty(draft, kept)
}

/** Whether a paste is meant for something else: a text box, or a pop-up over the page. */
const pasteIsElsewhere = () => {
	const focused = document.activeElement
	if (focused instanceof HTMLElement) {
		if (focused.matches("input, textarea, select") || focused.isContentEditable) return true
		if (focused.closest('[contenteditable]:not([contenteditable="false"])') !== null) return true
	}
	return isModalOpen(document)
}

const onpaste = (event: ClipboardEvent) => {
	if (pasteIsElsewhere()) return
	const text = event.clipboardData?.getData("text")?.trim().toUpperCase()
	if (text === undefined || text === "") return
	let read: ReturnType<typeof draftFromCode>
	try {
		read = draftFromCode(text)
	} catch {
		// Not a code: the browser can have it.
		return
	}
	event.preventDefault()
	// The docked editor is not modal: a paste beside it must not wipe edits nobody kept.
	if (hasEdits()) {
		say(m.combi.notices.pasteRefused, "warn")
		return
	}
	const entry = savedAs(codeOf(read.draft))
	if (entry !== undefined) openEntry(entry, m.combi.notices.pastedSaved(nameOf(entry)))
	else openDraft(read.draft, read.warnings, m.combi.notices.pasted)
}

// --- Editor actions ----------------------------------------------------------

const close = () => {
	draft = null
}

/** The note and stats as an entry keeps them. */
const noteOf = (from: Draft) => ({ description: from.note, stats: from.stats })

/** Refuses to save over another entry, whose note would be lost. */
const takenBy = (code: string, from: string | null) => {
	const other = readSaved(store).find((entry) => entry.code === code)
	return other !== undefined && other.code !== from ? other : undefined
}

const saveAs = (current: Draft) => {
	const code = codeOf(current)
	const other = takenBy(code, current.from)
	if (other !== undefined) {
		// Another tab may have saved it: show the list as it now stands.
		entries = readSaved(store)
		say(m.combi.notices.taken(nameOf(other)), "error")
		return
	}
	const result = saveCode(store, code, noteOf(current))
	entries = result.entries
	draft = { ...current, from: code }
	baseline = draft
	offered = null
	if (result.stored && persistent !== null) say(m.combi.notices.saved(combiSectionOf(code)))
	else say(m.combi.notices.refusedSave, "error")
}

const onsave = () => {
	if (draft !== null) saveAs({ ...draft, from: null })
}

const onsaveasnew = () => {
	if (draft !== null) saveAs({ ...draft, from: null })
}

const onupdate = () => {
	if (draft === null || draft.from === null) return
	const code = codeOf(draft)
	const result = updateSaved(store, draft.from, { code, ...noteOf(draft) })
	entries = result.entries
	if (!result.ok) {
		if (result.reason === "missing") {
			// Deleted in another tab since it was opened. Nothing left to update.
			draft = { ...draft, from: null }
			say(m.combi.notices.gone, "warn")
		} else {
			const other = result.entries.find((entry) => entry.code === code)
			say(m.combi.notices.taken(other === undefined ? combiSectionOf(code) : nameOf(other)), "error")
		}
		return
	}
	draft = { ...draft, from: code }
	baseline = draft
	const updated = result.entries.find((entry) => entry.code === code)
	if (result.stored && persistent !== null)
		say(m.combi.notices.updated(updated === undefined ? combiSectionOf(code) : nameOf(updated)))
	else say(m.combi.notices.refusedSave, "error")
}

const ondelete = () => {
	if (draft === null || draft.from === null) return
	const code = draft.from
	const result = removeSaved(store, code)
	entries = result.entries
	draft = null
	if (result.stored && persistent !== null) say(m.combi.notices.deleted(combiSectionOf(code)))
	else say(m.combi.notices.refusedDelete, "error")
}

/** Back to the opening build; the note, the stats and the entry it edits stay. */
const onreset = () => {
	if (draft === null) return
	draft = { ...newDraft(), note: draft.note, stats: draft.stats, from: draft.from }
}

/** A typed code replaces the build; the note, the stats and the entry it edits stay. */
const ontypecode = (code: string) => {
	if (draft === null) return
	const current = draft
	try {
		const { draft: next, warnings } = draftFromCode(code)
		// An edit like any other: the baseline a paste checks against stays.
		draft = { ...next, note: current.note, stats: current.stats, from: current.from }
		if (warnings.length > 0) sayChanges(warnings)
	} catch (error) {
		say(m.combi.notices.codeUnreadable(code, why(error)), "error")
	}
}

/** Copies the 10 characters the game takes, whatever loadout the code carries. */
const copy = async (code: string) => {
	const game = combiSectionOf(code)
	try {
		if (typeof navigator.clipboard?.writeText !== "function") throw new Error("no clipboard")
		await navigator.clipboard.writeText(game)
		say(m.combi.notices.copied(game))
	} catch {
		say(m.combi.notices.copyBlocked(game), "error")
	}
}

const shareDraft = () => {
	if (draft !== null) share = { code: codeOf(draft), note: draft.note, stats: draft.stats }
}

const shareEntry = (entry: SavedCode) => {
	share = { code: entry.code, note: entry.description, stats: entry.stats ?? {} }
}
</script>

<svelte:window bind:innerWidth={width} {onhashchange} />
<svelte:document {onpaste} />

<div class="combi" class:docked={docked && draft !== null}>
	<div class="list">
		<CombiList
			{entries}
			current={draft?.from ?? null}
			onnew={openNew}
			onopen={(entry) => openEntry(entry)}
			oncopy={(entry) => copy(entry.code)}
			onshare={shareEntry} />
	</div>
	{#if draft !== null}
		<CombiEditor
			{draft}
			{saved}
			open={true}
			{docked}
			onclose={close}
			onchange={(next) => (draft = next)}
			oncopy={() => draft !== null && copy(codeOf(draft))}
			onshare={shareDraft}
			{onsave}
			{onupdate}
			{onsaveasnew}
			{ondelete}
			{onreset}
			{ontypecode} />
	{/if}
</div>

<ShareDialog entry={share} onclose={() => (share = null)} />
<Toast message={notice?.message ?? null} tone={notice?.tone ?? "info"} ondismiss={dismiss} />

<style>
.combi {
	display: flex;
	align-items: flex-start;
	gap: 24px;
	min-width: 0;
}

.list {
	flex: 1;
	min-width: 0;
}

/* Docked (DOCK_MIN_WIDTH in #lib/frame): the editor is a column that stays in view while the list scrolls. */
.docked :global(.panel.docked) {
	position: sticky;
	/* Below the sticky 52px top bar, with the wrapper's 32px gutter to spare. */
	top: calc(52px + 16px);
	height: calc(100dvh - 52px - 32px);
	border: 1px solid var(--line);
	border-radius: 10px;
}
</style>
