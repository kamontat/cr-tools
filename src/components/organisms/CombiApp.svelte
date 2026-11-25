<script lang="ts">
import type { Draft } from "#lib/combi/draft"
import type { Issue } from "#lib/combi/issues"

import { onDestroy, onMount, tick } from "svelte"

import Toast from "#components/atoms/Toast.svelte"
import CombiEditor from "#components/organisms/CombiEditor.svelte"
import CombiList from "#components/organisms/CombiList.svelte"
import { copyText } from "#lib/clipboard"
import { codeOf, draftFrom, draftFromCode, isDirty, keptRounds, newDraft } from "#lib/combi/draft"
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
import { codeInHash, hashFor, noteInHash, roundsInHash, shareHashFor, type TabName } from "#lib/combi/state"
import { DOCK_MIN_WIDTH } from "#lib/frame"
import { messagesFor } from "#lib/i18n/messages"
import { currentLang, type Lang, onLangChange } from "#lib/lang"
import { localStore, memoryStore } from "#lib/storage"

let lang = $state<Lang>(currentLang(document))
const m = $derived(messagesFor(lang))

$effect(() => onLangChange(document, (next) => (lang = next)))

const persistent = localStore()
const store = persistent ?? memoryStore()

let entries = $state<SavedCode[]>(readSaved(store))
/** The build in the editor; the editor is open while there is one. */
let draft = $state.raw<Draft | null>(null)
/** The tab a row last asked the editor to show. */
let tabRequest = $state.raw<{ tab: TabName } | null>(null)

let width = $state(window.innerWidth)
/** Wide enough for the editor beside the list; narrower, the editor takes the list's place. */
const docked = $derived(width >= DOCK_MIN_WIDTH)
const dockedOpen = $derived(docked && draft !== null)
const viewing = $derived(!docked && draft !== null)

/**
 * Where the list was scrolled when the editor took its place, so coming back
 * lands on the same rows; the editor itself starts at the top.
 */
let listScroll = 0
let wasViewing = false
$effect(() => {
	const now = viewing
	if (now === wasViewing) return
	wasViewing = now
	if (now) {
		listScroll = window.scrollY
		window.scrollTo(0, 0)
	} else void tick().then(() => window.scrollTo(0, listScroll))
})

/** The sticky top bar's 52px, and 16px under it: where the docked editor sticks. */
const DOCK_TOP = 52 + 16
let combiBox = $state<HTMLElement | null>(null)
/** Where the docked editor's top is now: under the heading before the page scrolls, at DOCK_TOP after. */
let dockTop = $state(DOCK_TOP)

$effect(() => {
	if (!dockedOpen || combiBox === null) return
	const box = combiBox
	const measure = () => {
		dockTop = Math.max(DOCK_TOP, Math.round(box.getBoundingClientRect().top))
	}
	measure()
	window.addEventListener("scroll", measure, { passive: true })
	window.addEventListener("resize", measure)
	return () => {
		window.removeEventListener("scroll", measure)
		window.removeEventListener("resize", measure)
	}
})

/**
 * The draft as it was last opened or saved, to tell an edit from none: a paste
 * never replaces edits nobody has kept.
 */
let baseline = $state.raw<Draft | null>(null)
/** A link's draft whose note or rounds are offered and not yet kept; the address bar keeps carrying them. */
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
	say(`${m.combi.notices.readWithChanges}: ${m.combi.notices.changes(lines)}`, "warn")
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

/** Whether the open draft holds edits since it was opened or last saved. */
const hasEdits = () => {
	if (draft === null || baseline === null || draft === baseline) return false
	const kept: SavedCode = saved ?? {
		code: codeOf(baseline),
		description: cleanDescription(baseline.note),
		...(keptRounds(baseline).length === 0 ? {} : { rounds: keptRounds(baseline) }),
		savedAt: 0,
	}
	return isDirty(draft, kept)
}

/**
 * The docked editor is not modal, so a row, New code, a link or a paste can
 * come while it holds edits nobody kept. Those edits stay, and the notice says
 * why nothing opened.
 */
const keepsEdits = () => {
	if (!hasEdits()) return false
	say(m.combi.notices.unsavedEdits, "warn")
	return true
}

const openNew = () => {
	if (keepsEdits()) return
	openDraft(newDraft(), [])
}

/**
 * A row of the list: the entry already open stays as it is, edits and all.
 * A row's line asks for its tab too, on the entry it opens or the one open.
 */
const openRow = (entry: SavedCode, tab?: TabName) => {
	if (draft === null || draft.from !== entry.code) {
		if (keepsEdits()) return
		openEntry(entry)
	}
	if (tab !== undefined && draft?.from === entry.code) tabRequest = { tab }
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
 * A link may carry a note and rounds. They are offered, not saved: they go
 * into the editor, and keeping them is one press of Save. A code already saved
 * opens that entry instead, so Save cannot list it twice.
 */
const openLink = (hash: string) => {
	const code = codeInHash(hash)
	if (code === null) return
	const note = noteInHash(hash)
	const rounds = roundsInHash(hash)
	const carried = note !== null || rounds.length > 0
	if (draft !== null && !carried && codeOf(draft) === code) return
	if (keepsEdits()) {
		// The address bar goes back to the code still in the editor.
		writeHash(asked)
		return
	}

	let read: ReturnType<typeof draftFromCode>
	try {
		read = draftFromCode(code, note ?? "", rounds)
	} catch (error) {
		say(m.combi.notices.linkUnreadable(code, why(error)), "error")
		return
	}

	const entry = savedAs(codeOf(read.draft))
	if (entry !== undefined) {
		// Only a note or rounds the entry would not take are worth a word.
		openEntry(entry, carried ? m.combi.notices.linkSaved(nameOf(entry)) : undefined)
		return
	}
	const t = m.combi.notices
	const sentence = !carried ? undefined : note === null ? t.linkRounds : rounds.length === 0 ? t.linkNote : t.linkBoth
	openDraft(read.draft, read.warnings, sentence)
	if (carried) offered = read.draft
}

/** The hash this page last wrote, so a `hashchange` back to it is not a new link. */
let written = ""

const onhashchange = () => {
	if (location.hash === written) return
	// Back past the step opening the editor added: the address bar names no code, so the editor closes.
	if (codeInHash(location.hash) === null && draft !== null) {
		pushed = false
		written = location.hash
		draft = null
		void focusList()
		return
	}
	openLink(location.hash)
}

onMount(() => openLink(location.hash))

// The address bar names the code in the editor, so a reload or a copied URL
// opens it again; closing the editor clears it. A link's note and rounds stay
// in it until they are saved or edited, so a reload before Save keeps the offer.
let wasOpen = false
/** The hash last asked for, as given: the browser may spell what it keeps differently. */
let asked = ""
/**
 * Whether opening the editor added a step to the browser's history, so Back
 * closes it as it would close a page. A link already names its code, so
 * opening from one adds none.
 */
let pushed = false

/**
 * Points the address bar at `hash` (empty for none), only when it changes:
 * every note keystroke changes the draft, and Safari throws after 100 rewrites
 * in 10 seconds. A refused rewrite only leaves the address bar behind.
 */
const writeHash = (hash: string, push = false) => {
	const same = location.hash === hash || (hash === asked && location.hash === written)
	if (!same) {
		try {
			if (push) {
				history.pushState(null, "", hash)
				pushed = true
			} else history.replaceState(null, "", hash === "" ? location.pathname : hash)
		} catch {
			// The editor works the same; a reload just opens what the address bar still says.
		}
	}
	asked = hash
	written = location.hash
}

$effect(() => {
	if (draft !== null) {
		writeHash(
			offered !== null && draft === offered
				? shareHashFor(codeOf(draft), draft.note, keptRounds(draft))
				: hashFor(codeOf(draft)),
			!wasOpen && codeInHash(location.hash) === null,
		)
		wasOpen = true
	} else if (wasOpen) {
		if (!pushed) writeHash("")
		wasOpen = false
	}
})

/** Whether a paste is meant for something else: a text box. */
const pasteIsElsewhere = () => {
	const focused = document.activeElement
	if (!(focused instanceof HTMLElement)) return false
	if (focused.matches("input, textarea, select") || focused.isContentEditable) return true
	return focused.closest('[contenteditable]:not([contenteditable="false"])') !== null
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
	if (keepsEdits()) return
	const entry = savedAs(codeOf(read.draft))
	if (entry !== undefined) openEntry(entry, m.combi.notices.pastedSaved(nameOf(entry)))
	else openDraft(read.draft, read.warnings, m.combi.notices.pasted)
}

// --- Editor actions ----------------------------------------------------------

let listBox = $state<HTMLElement | null>(null)

/**
 * Focus inside an editor that goes away would fall to `<body>`: it goes to the
 * list's New code instead; focus that is still on the page stays where it is.
 */
const focusList = async () => {
	await tick()
	const active = document.activeElement
	if (active === null || active === document.body || !active.isConnected)
		listBox?.querySelector<HTMLElement>("button.new")?.focus()
}

const close = () => {
	draft = null
	void focusList()
	// The editor's own step in the browser's history goes too, so Back leaves the page as it would have.
	if (pushed) {
		pushed = false
		history.back()
	}
}

/** The note and rounds as an entry keeps them. */
const noteOf = (from: Draft) => ({ description: from.note, rounds: keptRounds(from) })

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

/** Save and Save as new both add the build as a new entry; the entry it was opened from stays. */
const saveNew = () => {
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
	deleteCode(draft.from)
}

/** Deletes a saved entry, from the editor or its row; an editor open on it closes with it. */
const deleteCode = (code: string) => {
	const result = removeSaved(store, code)
	entries = result.entries
	if (draft?.from === code) draft = null
	void focusList()
	if (result.stored && persistent !== null) say(m.combi.notices.deleted(combiSectionOf(code)))
	else say(m.combi.notices.refusedDelete, "error")
}

/** Back to the opening build; the note, the rounds and the entry it edits stay. */
const onreset = () => {
	if (draft === null) return
	draft = { ...newDraft(), note: draft.note, rounds: draft.rounds, from: draft.from }
}

/** A typed code replaces the build; the note, the rounds and the entry it edits stay. */
const ontypecode = (code: string) => {
	if (draft === null) return
	const current = draft
	try {
		const { draft: next, warnings } = draftFromCode(code)
		// An edit like any other: the baseline a paste checks against stays.
		draft = { ...next, note: current.note, rounds: current.rounds, from: current.from }
		if (warnings.length > 0) sayChanges(warnings)
	} catch (error) {
		say(m.combi.notices.codeUnreadable(code, why(error)), "error")
	}
}

/** Copies the 10 characters the game takes, whatever loadout the code carries. */
const copy = async (code: string) => {
	const game = combiSectionOf(code)
	if (await copyText(game)) say(m.combi.notices.copied(game))
	else say(m.combi.notices.copyBlocked(game), "error")
}
</script>

<svelte:window bind:innerWidth={width} {onhashchange} />
<svelte:document {onpaste} />

<div
	class="combi"
	class:docked={dockedOpen}
	class:viewing
	bind:this={combiBox}
	style:--dock-top={dockedOpen ? `${dockTop}px` : undefined}>
	<div class="list" bind:this={listBox} hidden={viewing}>
		<CombiList
			{entries}
			current={draft?.from ?? null}
			onnew={openNew}
			onopen={openRow}
			oncopy={(entry) => copy(entry.code)}
			ondelete={(entry) => deleteCode(entry.code)} />
	</div>
	{#if draft !== null}
		<CombiEditor
			{draft}
			{saved}
			open={true}
			view={!docked}
			onclose={close}
			onchange={(next) => (draft = next)}
			oncopy={() => draft !== null && copy(codeOf(draft))}
			onsave={saveNew}
			{onupdate}
			onsaveasnew={saveNew}
			{ondelete}
			{onreset}
			{ontypecode}
			request={tabRequest} />
	{/if}
</div>

<Toast message={notice?.message ?? null} tone={notice?.tone ?? "info"} ondismiss={dismiss} />

<style>
/* The reset makes every div a column; the list and the docked editor sit in a row. */
.combi {
	--list-min: 360px;
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	gap: 24px;
	min-width: 0;
}

.list {
	flex: 1;
	min-width: 0;
}

/* Beside the editor, the list keeps room for its rows however wide the editor is dragged. */
.docked .list {
	min-width: var(--list-min);
}

/* Below the dock breakpoint the editor takes the list's place, the page's whole width. */
.viewing :global(.panel[data-layout="view"]) {
	border: 1px solid var(--line);
	border-radius: 10px;
}

/*
 * Docked (DOCK_MIN_WIDTH in #lib/frame): the editor is a column that stays in
 * view while the list scrolls, below the sticky top bar (DOCK_TOP), and ends
 * 16px above the window's bottom from wherever its top is (--dock-top), so its
 * footer is on screen before the page scrolls and after.
 */
.docked :global(.panel.docked) {
	position: sticky;
	top: 68px;
	align-self: flex-start;
	height: calc(100dvh - var(--dock-top, 68px) - 16px);
	max-height: calc(100dvh - var(--dock-top, 68px) - 16px);
	max-width: calc(100% - var(--list-min) - 24px);
	border: 1px solid var(--line);
	border-radius: 10px;
}
</style>
