import { readFile } from "node:fs/promises"
import { expect, test } from "vitest"

test("AppLayout's pre-paint boot script takes the key and breakpoint from #lib/frame", async () => {
	const source = await readFile("src/layouts/AppLayout.astro", "utf8")
	expect(source).toMatch(/import \{[^}]*\bFULL_MIN_WIDTH\b[^}]*\bSIDEBAR_KEY\b[^}]*\} from "#lib\/frame"/)
	const boot = source.match(/<script define:vars=\{\{([^}]*)\}\}>([\s\S]*?)<\/script>/)
	expect(boot).not.toBeNull()
	expect(boot?.[1]).toContain("SIDEBAR_KEY")
	expect(boot?.[1]).toContain("FULL_MIN_WIDTH")
	expect(boot?.[2]).not.toContain("frame:sidebar")
	expect(boot?.[2]).not.toMatch(/\b1100\b/)
})

test("AppLayout gives every page one padded, width-capped wrapper", async () => {
	const source = await readFile("src/layouts/AppLayout.astro", "utf8")
	expect(source).toMatch(/<main id="content">\s*<div class="wrap">\s*<slot \/>\s*<\/div>\s*<\/main>/)
	const wrap = source.match(/\n\.wrap \{([^}]*)\}/)?.[1]
	expect(wrap).toMatch(/max-width:/)
	expect(wrap).toMatch(/padding:/)
})

test("SettingsApp leaves the gutter to the frame", async () => {
	const source = await readFile("src/components/organisms/SettingsApp.svelte", "utf8")
	expect(source.match(/\n\.settings \{([^}]*)\}/)?.[1]).not.toMatch(/padding/)
})
