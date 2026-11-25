import { readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "vitest"

// happy-dom computes no layout, so the layout rules a real engine depends on
// are checked in the source.

const root = join(import.meta.dirname, "..", "..")
const read = (path: string) => readFileSync(join(root, path), "utf8")

/** The declarations of the first rule whose selector is exactly `selector`. */
const rule = (source: string, selector: string): string => {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	return new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? ""
}

test("the combi page lays the list and the docked editor side by side", () => {
	// The reset makes every div a column; the page must ask for a row.
	expect(rule(read("src/components/organisms/CombiApp.svelte"), ".combi")).toMatch(/flex-direction:\s*row/)
})

test("the docked editor stays in view and keeps its footer on screen", () => {
	const docked = rule(read("src/components/organisms/CombiApp.svelte"), ".docked :global(.panel.docked)")
	expect(docked).toMatch(/position:\s*sticky/)
	expect(docked).toMatch(/align-self:\s*flex-start/)
	expect(docked).toMatch(/max-height:\s*calc\(100dvh/)
})

test("an open row's details stand apart from its head, whose hover colour reaches its bottom edge", () => {
	const details = rule(read("src/components/organisms/CombiList.svelte"), ".details")
	expect(details).toMatch(/margin:\s*1\dpx 16px 14px/)
})

test("the Share box spaces its parts: its sections are columns, since the reset makes only divs one", () => {
	const share = read("src/components/organisms/ShareBox.svelte")
	for (const selector of [".share", ".box"]) {
		expect(rule(share, selector), selector).toMatch(/display:\s*flex/)
		expect(rule(share, selector), selector).toMatch(/flex-direction:\s*column/)
		expect(rule(share, selector), selector).toMatch(/gap:\s*\d+px/)
	}
})

test("beside the editor, the list keeps room for its rows however wide the editor is dragged", () => {
	const app = read("src/components/organisms/CombiApp.svelte")
	expect(rule(app, ".docked :global(.panel.docked)")).toMatch(/max-width:\s*calc\(100% - var\(--list-min\)/)
	expect(rule(app, ".docked .list")).toMatch(/min-width:\s*var\(--list-min\)/)
})

test("the saved list lays its rows out by its own width, not the window's", () => {
	const list = read("src/components/organisms/CombiList.svelte")
	expect(rule(list, ".list")).toMatch(/container(?:-type)?:\s*(?:list\s*\/\s*)?inline-size/)
	expect(list).toMatch(/@container list \(max-width: \d+px\)\s*\{\s*\.head\s*\{/)
	expect(list).not.toMatch(/@media \(min-width: 1100px\)/)
})

/** The stacking tokens `tokens.css` defines, by name. */
const layer = (name: string): number => {
	const value = new RegExp(`--z-${name}:\\s*(\\d+);`).exec(read("src/styles/tokens.css"))?.[1]
	return value === undefined ? Number.NaN : Number(value)
}

test("notices stack above the top bar, the top bar above the sidebar", () => {
	expect(layer("toast")).toBeGreaterThan(layer("topbar"))
	expect(layer("topbar")).toBeGreaterThan(layer("sidebar"))
	expect(layer("sidebar")).toBeGreaterThan(layer("scrim"))
})

test("the frame's layers take their z-index from the tokens", () => {
	expect(rule(read("src/components/atoms/Toast.svelte"), ".host")).toMatch(/z-index:\s*var\(--z-toast\)/)
	expect(rule(read("src/components/organisms/TopBar.astro"), ".top-bar")).toMatch(/z-index:\s*var\(--z-topbar\)/)
})

test("a narrow panel gives its title its own line and puts the actions under it", () => {
	const panel = read("src/components/molecules/Panel.svelte")
	expect(rule(panel, ".panel")).toMatch(/container(?:-type)?:\s*(?:panel\s*\/\s*)?inline-size/)
	const narrow = /@container panel \(max-width: \d+px\)\s*\{([\s\S]*?)\n\}/.exec(panel)?.[1] ?? ""
	expect(narrow).toMatch(/\.panel-head\s*\{[^}]*flex-wrap:\s*wrap/)
	expect(narrow).toMatch(/\.panel-actions\s*\{[^}]*flex-basis:\s*100%/)
})

test("in view mode the editor takes the page's whole width, not the docked column's", () => {
	expect(rule(read("src/components/molecules/Panel.svelte"), '.panel[data-layout="view"]')).toMatch(/width:\s*100%/)
})

test("a shared button shows where keyboard focus is", () => {
	expect(rule(read("src/components/atoms/Button.svelte"), ".btn:focus-visible")).toMatch(
		/outline:\s*2px solid var\(--accent\)/,
	)
})
