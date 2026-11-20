<script lang="ts">
import type { SavedCode } from "#lib/combi/saved"

import { tick } from "svelte"

import Tabs from "#components/atoms/Tabs.svelte"
import CodeDisplay from "#components/molecules/CodeDisplay.svelte"
import Panel from "#components/molecules/Panel.svelte"
import EditorBoostsTab from "#components/organisms/EditorBoostsTab.svelte"
import EditorMainTab from "#components/organisms/EditorMainTab.svelte"
import EditorRolesTab from "#components/organisms/EditorRolesTab.svelte"
import EditorRunLogTab from "#components/organisms/EditorRunLogTab.svelte"
import EditorTreasuresTab from "#components/organisms/EditorTreasuresTab.svelte"
import { CODE_LENGTH } from "#lib/combi/codec"
import { describeRun } from "#lib/combi/describe"
import { codeOf, type Draft, draftFromCode, isDirty, tabBadges, tabEnabled } from "#lib/combi/draft"
import { canJump, jumpTab } from "#lib/combi/editor"
import { combiSectionOf } from "#lib/combi/full-code"
import { hintsFor } from "#lib/combi/hints"
import { CodeError, issueText } from "#lib/combi/issues"
import { rememberTab, storedTab, TAB_NAMES, type TabName } from "#lib/combi/state"
import { messagesFor } from "#lib/i18n/messages"
import { currentLang, type Lang, onLangChange } from "#lib/lang"
import { localStore } from "#lib/storage"

interface Props {
	draft: Draft
	/** The saved entry the draft was opened from, or null for a new code. */
	saved: SavedCode | null
	open: boolean
	/** Beside the list on a wide screen rather than a pop-up over it. */
	docked: boolean
	onclose: () => void
	onchange: (draft: Draft) => void
	oncopy: () => void
	onshare: () => void
	onsave: () => void
	onupdate: () => void
	onsaveasnew: () => void
	ondelete: () => void
	onreset: () => void
	/** A typed code that reads; the caller opens it and shows its warnings. */
	ontypecode: (code: string) => void
}

let {
	draft,
	saved,
	open,
	docked,
	onclose,
	onchange,
	oncopy,
	onshare,
	onsave,
	onupdate,
	onsaveasnew,
	ondelete,
	onreset,
	ontypecode,
}: Props = $props()

let lang = $state<Lang>(currentLang(document))
const m = $derived(messagesFor(lang))

$effect(() => onLangChange(document, (next) => (lang = next)))

/** Unique per mount: every field id starts with it. */
const uid = $props.id()
const store = localStore()

let chosen = $state<TabName>(store === null ? "main" : storedTab(store))
/** A tab the episode switches off falls back to Main, and comes back when it allows it again. */
const tab = $derived(tabEnabled(draft, chosen) ? chosen : "main")

const code = $derived(codeOf(draft))
const hints = $derived(hintsFor(code, m))
const summary = $derived(describeRun(draft.full, m).join(" · "))
const badges = $derived(tabBadges(draft))
const tabs = $derived(
	TAB_NAMES.map((value) => ({
		value,
		label: m.combi.editor.tabs[value],
		badge: badges[value],
		disabled: !tabEnabled(draft, value),
	})),
)

const editing = $derived(saved !== null)
const canUpdate = $derived(saved !== null && draft.from !== null && isDirty(draft, saved))
const canSaveAsNew = $derived(saved !== null && code !== saved.code)

function pickTab(next: string) {
	chosen = next as TabName
	if (store !== null) rememberTab(store, chosen)
}

/** The field each group of characters leads to, by the id its `Field` was given. */
const FIELDS: Readonly<Record<string, string>> = {
	mode: "mode",
	goal: "goal",
	episode: "episode",
	floor: "floor",
	action: "action",
	cookie: "lead",
	relay: "relay",
	pet: "pet",
	treasures: "order",
	treasureOrder: "order",
	boosts: "boosts",
	randomBoost: "randomBoost",
	cookiePowers: "powers",
}

let body = $state<HTMLElement | null>(null)
let foot = $state<HTMLElement | null>(null)

/** Selects the tab that owns a group of characters and focuses its control: the pressed one, else the first. */
async function jump(group: string) {
	const owner = jumpTab(group)
	if (owner === null || body === null) return
	pickTab(owner)
	await tick()
	const slot = /^treasure(\d)$/.exec(group)
	const field = Object.hasOwn(FIELDS, group) ? FIELDS[group] : undefined
	const box = slot
		? body.querySelector<HTMLElement>(`[data-slot="${slot[1]}"]`)
		: field === undefined
			? null
			: body.querySelector<HTMLElement>(`[aria-labelledby="${uid}-${field}-label"]`)
	if (box === null) return
	const controls = Array.from(box.querySelectorAll<HTMLElement>("button, input, textarea")).filter(
		(control) => !(control as HTMLButtonElement).disabled && !control.matches('[aria-controls$="-help"]'),
	)
	const target = controls.find((control) => control.getAttribute("aria-pressed") === "true") ?? controls[0]
	box.scrollIntoView?.({ block: "nearest" })
	target?.focus()
}

// Typing a code: the input under the code display, opened from the menu.
let typing = $state(false)
let typed = $state("")
let typeInput = $state<HTMLInputElement | null>(null)

type Reading = { kind: "hint" | "count" | "error"; text: string } | { kind: "ok"; text: "" }

function readTyped(text: string): Reading {
	if (text === "") return { kind: "hint", text: m.combi.editor.typeHint }
	const game = combiSectionOf(text)
	if (game.length !== CODE_LENGTH) return { kind: "count", text: m.combi.editor.typeCount(game.length, CODE_LENGTH) }
	try {
		draftFromCode(text)
		return { kind: "ok", text: "" }
	} catch (error) {
		return { kind: "error", text: error instanceof CodeError ? issueText(error.issue, m) : String(error) }
	}
}

const reading = $derived(readTyped(typed))

async function startTyping() {
	menuOpen = false
	typed = ""
	typing = true
	await tick()
	typeInput?.focus()
}

function typeInputChanged(event: Event & { currentTarget: HTMLInputElement }) {
	const input = event.currentTarget
	const upper = input.value.toUpperCase()
	if (input.value !== upper) {
		const at = input.selectionStart
		input.value = upper
		if (at !== null) input.setSelectionRange(at, at)
	}
	typed = upper.trim()
	if (readTyped(typed).kind === "ok") ontypecode(typed)
}

function typeKeydown(event: KeyboardEvent) {
	if (event.key === "Escape") {
		event.preventDefault()
		typing = false
	} else if (event.key === "Enter" && !event.ctrlKey && !event.metaKey) {
		event.preventDefault()
		if (reading.kind !== "ok") return
		ontypecode(typed)
		typing = false
	}
}

// The ⋯ menu.
let menuOpen = $state(false)
let menuWrap = $state<HTMLElement | null>(null)
let menu = $state<HTMLElement | null>(null)

async function toggleMenu() {
	menuOpen = !menuOpen
	if (!menuOpen) return
	await tick()
	menu?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
}

function menuKeydown(event: KeyboardEvent) {
	if (menu === null) return
	const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'))
	const at = items.indexOf(event.target as HTMLElement)
	if (event.key === "Escape") {
		event.preventDefault()
		menuOpen = false
		menuWrap?.querySelector<HTMLElement>("[aria-haspopup]")?.focus()
	} else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
		event.preventDefault()
		const step = event.key === "ArrowDown" ? 1 : -1
		items[(at + step + items.length) % items.length]?.focus()
	}
}

function choose(action: () => void) {
	menuOpen = false
	action()
}

function saveOrUpdate() {
	if (saved === null) onsave()
	else if (canUpdate) onupdate()
}

/** Ctrl/Cmd+Enter saves or updates from anywhere in the editor; a click outside the menu closes it. */
function onkeydown(event: KeyboardEvent) {
	if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) return
	const target = event.target as Node | null
	if (target === null || !(body?.contains(target) || foot?.contains(target))) return
	event.preventDefault()
	saveOrUpdate()
}

function onclick(event: MouseEvent) {
	if (menuOpen && menuWrap !== null && !menuWrap.contains(event.target as Node)) menuOpen = false
}
</script>

<svelte:document {onkeydown} {onclick} />

<Panel
	id="editor"
	title={draft.from === null ? m.combi.editor.newTitle : m.combi.editor.editTitle}
	{open}
	{docked}
	{onclose}
	closeLabel={m.frame.close}
	resizeLabel={m.frame.resize}>
	<div class="editor" bind:this={body}>
		<div class="head">
			<CodeDisplay {code} {summary} {hints} onjump={jump} canJump={(group) => canJump(draft, group)} />
			{#if typing}
				<div class="typing">
					<input
						bind:this={typeInput}
						type="text"
						class="type-code"
						aria-label={m.combi.editor.code}
						aria-describedby="{uid}-type-status"
						aria-invalid={reading.kind === "error" ? "true" : undefined}
						autocapitalize="characters"
						autocomplete="off"
						spellcheck="false"
						value={typed}
						oninput={typeInputChanged}
						onkeydown={typeKeydown}
						onblur={() => (typing = false)}>
					<p class="type-status" class:error={reading.kind === "error"} id="{uid}-type-status" aria-live="polite">
						{reading.text}
					</p>
				</div>
			{/if}
		</div>

		<div class="tabs">
			<Tabs label={m.combi.editor.sections} {tabs} value={tab} onchange={pickTab} />
		</div>

		{#each TAB_NAMES as name (name)}
			<div class="tabpanel" role="tabpanel" aria-label={m.combi.editor.tabs[name]} hidden={name !== tab}>
				{#if name === tab}
					{#if name === "main"}
						<EditorMainTab {uid} {draft} {m} {onchange} />
					{:else if name === "cookies"}
						<EditorRolesTab {uid} {draft} {m} {onchange} />
					{:else if name === "treasures"}
						<EditorTreasuresTab {uid} {draft} {m} {onchange} />
					{:else if name === "boosts"}
						<EditorBoostsTab {uid} {draft} {m} {onchange} />
					{:else}
						<EditorRunLogTab {uid} {draft} {m} {onchange} />
					{/if}
				{/if}
			</div>
		{/each}
	</div>

	{#snippet footer()}
		<div row class="foot" bind:this={foot}>
			<button type="button" class="btn primary" onclick={oncopy}>{m.combi.editor.copy}</button>
			<button type="button" class="btn" onclick={onshare}>{m.combi.editor.share}</button>
			{#if saved === null}
				<button type="button" class="btn" onclick={onsave}>{m.combi.editor.save}</button>
			{:else if canUpdate}
				<button type="button" class="btn" onclick={onupdate}>{m.combi.editor.update}</button>
			{/if}
			<div class="menu-wrap" bind:this={menuWrap}>
				<button
					type="button"
					class="btn more"
					aria-label={m.combi.editor.more}
					title={m.combi.editor.more}
					aria-haspopup="menu"
					aria-expanded={menuOpen}
					onclick={toggleMenu}>
					⋯
				</button>
				{#if menuOpen}
					<div
						class="menu"
						role="menu"
						tabindex="-1"
						aria-label={m.combi.editor.more}
						bind:this={menu}
						onkeydown={menuKeydown}>
						<button type="button" role="menuitem" onclick={startTyping}>{m.combi.editor.typeCode}</button>
						<button type="button" role="menuitem" onclick={() => choose(onreset)}>{m.combi.editor.reset}</button>
						{#if canSaveAsNew}
							<button type="button" role="menuitem" onclick={() => choose(onsaveasnew)}>
								{m.combi.editor.saveAsNew}
							</button>
						{/if}
						{#if editing}
							<button type="button" role="menuitem" class="danger" onclick={() => choose(ondelete)}>
								{m.combi.editor.delete}
							</button>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/snippet}
</Panel>

<style>
.editor {
	gap: 12px;
	min-width: 0;
}

.head {
	gap: 8px;
}

.typing {
	gap: 4px;
}

.type-code {
	min-height: 36px;
	padding: 6px 10px;
	border: 1px solid var(--line);
	border-radius: var(--radius);
	background: var(--surface);
	color: var(--code);
	font-family: var(--mono);
	font-size: 1rem;
}

.type-code[aria-invalid="true"] {
	border-color: var(--danger);
}

.type-status {
	margin: 0;
	color: var(--muted);
	font-size: 0.8125rem;
}

.type-status.error {
	color: var(--danger);
}

.tabpanel {
	gap: 20px;
	min-width: 0;
	padding-block: 8px 24px;
}

.foot {
	flex: 1;
	align-items: center;
	gap: 8px;
	min-width: 0;
}

.btn {
	flex: 1;
	min-height: 36px;
	padding: 6px 12px;
	border: 1px solid var(--line);
	border-radius: var(--radius);
	background: var(--surface);
	color: var(--text);
	font: inherit;
	font-weight: 500;
	cursor: pointer;
}

@media (pointer: coarse) {
	.btn,
	.type-code {
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

.menu-wrap {
	position: relative;
}

.btn.more {
	flex: none;
	min-width: 44px;
}

.menu {
	position: absolute;
	right: 0;
	bottom: calc(100% + 6px);
	z-index: 5;
	min-width: 180px;
	padding: 4px;
	border: 1px solid var(--line);
	border-radius: var(--radius-lg);
	background: var(--surface);
}

.menu button {
	padding: 9px 12px;
	border: 0;
	border-radius: 6px;
	background: none;
	color: var(--text);
	font: inherit;
	text-align: start;
	cursor: pointer;
}

.menu button:hover,
.menu button:focus-visible {
	background: var(--hover);
}

.menu .danger {
	color: var(--danger);
}
</style>
