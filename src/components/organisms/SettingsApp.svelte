<script lang="ts">
import Segmented from "#components/atoms/Segmented.svelte"
import SettingsRow from "#components/molecules/SettingsRow.svelte"
import BackupBox from "#components/organisms/BackupBox.svelte"
import DeleteAllBox from "#components/organisms/DeleteAllBox.svelte"
import RestoreBox from "#components/organisms/RestoreBox.svelte"
import StorageBox from "#components/organisms/StorageBox.svelte"
import { type AboutRow, aboutRows, type BuildEnv, formatBuilt, readBuildInfo } from "#lib/build-info"
import { LOCAL_LIMIT, localUse, usageText } from "#lib/combi/backup"
import { readSaved, type SavedCode } from "#lib/combi/saved"
import { messagesFor } from "#lib/i18n/messages"
import { applyLang, currentLang, LANG_NAMES, LANGS, type Lang, LOCALES, onLangChange, writeLang } from "#lib/lang"
import { localStore } from "#lib/storage"
import { applyTheme, readTheme, type Theme, writeTheme } from "#lib/theme"

interface Props {
	env?: BuildEnv
}

let { env }: Props = $props()

let lang = $state<Lang>(currentLang(document))
const m = $derived(messagesFor(lang))

$effect(() => onLangChange(document, (next) => (lang = next)))

let theme = $state<Theme>(readTheme())

/** Stands in for a browser that keeps nothing, so the rows still work for this visit. */
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
let refresh = $state(0)

const reread = () => {
	entries = readSaved(store)
	refresh += 1
}

const usage = $derived.by(() => {
	void refresh
	void entries
	return usageText(localUse(persistent), LOCAL_LIMIT, LOCALES[lang])
})
const usageValue = $derived(`${usage.used} / ${usage.limit} (${usage.percent})`)

const info = $derived(readBuildInfo(env))
const rows = $derived(aboutRows(info))
const summary = $derived(
	[
		m.settings.environments[info.environment],
		info.environment === "preview" || info.environment === "production" ? info.shortCommit : null,
	]
		.filter((part) => part)
		.join(" · "),
)
const themes = $derived(
	(["system", "dark", "light"] as const).map((value) => ({ value, label: m.settings.themes[value] })),
)
const langs = LANGS.map((l) => ({ value: l, label: LANG_NAMES[l], lang: l }))

const pickLang = (value: string) => {
	const next = value as Lang
	writeLang(next)
	applyLang(next, document)
}

const pick = (value: string) => {
	theme = value as Theme
	writeTheme(theme)
	applyTheme(theme, document.documentElement)
}

const shown = (row: AboutRow) => {
	if (row.key === "environment") return m.settings.environments[info.environment]
	if (row.key === "built") return info.builtAt === null ? m.settings.unknown : formatBuilt(info.builtAt, LOCALES[lang])
	return row.text
}
</script>

<div class="settings">
	<section aria-labelledby="set-appearance">
		<h2 id="set-appearance">{m.settings.appearance}</h2>
		<div class="rows">
			<div class="row">
				<span>{m.settings.language}</span>
				<Segmented label={m.settings.language} options={langs} value={lang} onchange={pickLang} />
			</div>
			<div class="row">
				<span>{m.settings.theme}</span>
				<Segmented label={m.settings.theme} options={themes} value={theme} onchange={pick} />
			</div>
		</div>
	</section>

	<section aria-labelledby="set-data">
		<h2 id="set-data">{m.settings.data.title}</h2>
		<div class="rows">
			<SettingsRow label={m.settings.data.storage} value={usageValue}>
				{#snippet aside()}
					<meter
						class="bar"
						aria-label={m.settings.data.localStorage}
						min="0"
						max="1"
						value={Math.min(1, usage.ratio)}></meter>
				{/snippet}
				<StorageBox {entries} {m} store={persistent} {refresh} />
			</SettingsRow>
			<SettingsRow label={m.settings.data.backUp}>
				<BackupBox {entries} {m} />
			</SettingsRow>
			<SettingsRow label={m.settings.data.restore}>
				<RestoreBox {store} {entries} {m} onrestored={reread} />
			</SettingsRow>
			<SettingsRow label={m.settings.data.deleteAll}>
				<DeleteAllBox {store} count={entries.length} {m} ondeleted={reread} />
			</SettingsRow>
		</div>
	</section>

	<section aria-labelledby="set-about">
		<h2 id="set-about">{m.settings.about}</h2>
		<div class="rows">
			<SettingsRow label={m.settings.about} value={summary}>
				<dl class="about">
					{#each rows as row (row.key)}
						<div class="item">
							<dt>{m.settings.rows[row.key]}</dt>
							<dd>
								{#if row.href}
									<a href={row.href} target="_blank" rel="noopener">{shown(row)}</a>
								{:else}
									{shown(row)}
								{/if}
							</dd>
						</div>
					{/each}
				</dl>
			</SettingsRow>
		</div>
	</section>
</div>

<style>
.settings {
	gap: 20px;
	max-width: 640px;
}

h2 {
	margin: 0 0 8px;
	color: var(--muted);
	font-size: 13px;
	font-weight: 600;
}

.rows {
	border: 1px solid var(--line);
	border-radius: var(--radius-lg);
	background: var(--surface);
}

.row {
	display: flex;
	flex-flow: row wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 10px 14px;
	border-bottom: 1px solid var(--line);
}

.row:last-child {
	border-bottom: 0;
}

.bar {
	width: calc(100% - 28px);
	height: 6px;
	margin: 0 14px 10px;
}

.about {
	margin: 0;
	padding: 0 14px 6px;
}

.item {
	display: flex;
	flex-flow: row wrap;
	justify-content: space-between;
	gap: 12px;
	padding: 10px 0;
	border-bottom: 1px solid var(--line);
}

dt {
	color: var(--muted);
}

dd {
	margin: 0;
	text-align: right;
	overflow-wrap: anywhere;
}

a {
	color: var(--accent);
}
</style>
