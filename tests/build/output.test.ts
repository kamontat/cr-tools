import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { Window } from "happy-dom"
import { beforeAll, expect, test } from "vitest"

import { TOOLS } from "#lib/tools"

const root = `${import.meta.dirname}/../..`

beforeAll(() => {
	const build = spawnSync("pnpm", ["run", "build"], { cwd: root, encoding: "utf8" })
	if (build.status !== 0) throw new Error(build.stderr)
}, 120_000)

test("icons ship as files and the index does not", () => {
	expect(existsSync(`${root}/dist/assets/cookies/fire_spirit_cookie.webp`)).toBe(true)
	expect(readFileSync(`${root}/dist/.assetsignore`, "utf8")).toContain("assets/index.json")
})

test("pages build as folders, so /combi-name/ and its hash links still open", () => {
	expect(existsSync(`${root}/dist/combi-name/index.html`)).toBe(true)
	expect(existsSync(`${root}/dist/combi-name.html`)).toBe(false)
	expect(existsSync(`${root}/dist/settings/index.html`)).toBe(true)
	expect(existsSync(`${root}/dist/settings.html`)).toBe(false)
})

test("Home has the heading and one card per tool", () => {
	const html = readFileSync(`${root}/dist/index.html`, "utf8")
	const doc = new new Window().DOMParser().parseFromString(html, "text/html")
	expect(doc.querySelector("h1")?.textContent).toBe("Cookie Run tools")
	const hrefs = [...doc.querySelectorAll("main a.tool-card")].map((a) => a.getAttribute("href"))
	expect(hrefs).toEqual(TOOLS.map(({ slug }) => `/${slug}/`))
})
