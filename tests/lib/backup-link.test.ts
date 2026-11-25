import { expect, test } from "vitest"

import { fetchLink, type ResolvedLink, resolveLink } from "#lib/backup-link"

test("a gist page is read from its raw address, the file named by the anchor", () => {
	expect(resolveLink("https://gist.github.com/kamontat/abc123#file-codes-json")).toEqual({
		url: "https://gist.githubusercontent.com/kamontat/abc123/raw/codes.json",
		name: "codes.json",
		platform: "gist",
	})
})

test("the anchor's last dash goes back to a dot", () => {
	expect(resolveLink("https://gist.github.com/kamontat/abc123#file-my-codes-json")?.url).toBe(
		"https://gist.githubusercontent.com/kamontat/abc123/raw/my-codes.json",
	)
})

test("a gist with no anchor reads its first file and is named by its id", () => {
	expect(resolveLink("https://gist.github.com/kamontat/abc123")).toEqual({
		url: "https://gist.githubusercontent.com/kamontat/abc123/raw",
		name: "abc123",
		platform: "gist",
	})
})

test("a PasteFox page typed without a scheme is read from its raw address", () => {
	expect(resolveLink("pastefox.com/206br1")).toEqual({
		url: "https://pastefox.com/api/pastes/206br1/raw",
		name: "206br1",
		platform: "pastefox",
	})
})

test("PasteFox's own pages and a bare gist host are ordinary links", () => {
	expect(resolveLink("https://pastefox.com/create")).toEqual({
		url: "https://pastefox.com/create",
		name: "create",
		platform: null,
	})
	expect(resolveLink("https://gist.github.com/")).toEqual({
		url: "https://gist.github.com/",
		name: "gist.github.com",
		platform: null,
	})
	for (const page of ["docs", "login", "signup", "pricing", "about", "api"]) {
		expect(resolveLink(`https://pastefox.com/${page}`)?.platform).toBeNull()
	}
})

test("an ordinary link is named by its last path segment, else its host", () => {
	expect(resolveLink("https://example.com/b/cr.json")).toEqual({
		url: "https://example.com/b/cr.json",
		name: "cr.json",
		platform: null,
	})
	expect(resolveLink("https://example.com/")?.name).toBe("example.com")
})

test("a link with no scheme is read over https, and localhost is a host", () => {
	expect(resolveLink("localhost:4321/x")?.url).toBe("https://localhost:4321/x")
	expect(resolveLink("example.com/a.json")?.url).toBe("https://example.com/a.json")
	expect(resolveLink("  http://example.com/a.json  ")?.url).toBe("http://example.com/a.json")
})

test("anything else is not an address", () => {
	expect(resolveLink("ftp://x")).toBeNull()
	expect(resolveLink("ftp://example.com/a")).toBeNull()
	expect(resolveLink("nodot")).toBeNull()
	expect(resolveLink("")).toBeNull()
	expect(resolveLink("   ")).toBeNull()
	expect(resolveLink("two words.com")).toBeNull()
})

const link = (platform: ResolvedLink["platform"]): ResolvedLink => ({ url: "https://x.test/a", name: "a", platform })
const answer = (status: number, body = ""): typeof fetch => (() => Promise.resolve(new Response(body, { status }))) as typeof fetch

test("a fetch that never answers is unreachable", async () => {
	const down = (() => Promise.reject(new TypeError("Failed to fetch"))) as typeof fetch
	expect(await fetchLink(link(null), down)).toEqual({ ok: false, failure: { reason: "unreachable", platform: null } })
	expect(await fetchLink(link("gist"), down)).toEqual({ ok: false, failure: { reason: "unreachable", platform: "gist" } })
})

test("a gist or paste that is gone or private says so", async () => {
	expect(await fetchLink(link("gist"), answer(404))).toEqual({
		ok: false,
		failure: { reason: "missing", platform: "gist", status: 404 },
	})
	expect(await fetchLink(link("pastefox"), answer(410))).toMatchObject({ ok: false, failure: { reason: "missing" } })
	expect(await fetchLink(link("gist"), answer(403))).toMatchObject({ ok: false, failure: { reason: "private" } })
	expect(await fetchLink(link("pastefox"), answer(401))).toMatchObject({ ok: false, failure: { reason: "private" } })
})

test("elsewhere an error status is only a status", async () => {
	expect(await fetchLink(link(null), answer(404))).toEqual({
		ok: false,
		failure: { reason: "status", platform: null, status: 404 },
	})
	expect(await fetchLink(link("gist"), answer(500))).toEqual({
		ok: false,
		failure: { reason: "status", platform: "gist", status: 500 },
	})
})

test("an answer is its text", async () => {
	expect(await fetchLink(link(null), answer(200, "1-MS0A000000"))).toEqual({ ok: true, text: "1-MS0A000000" })
})

test("a body that fails to read is unreachable, never a rejection", async () => {
	const broken = (() =>
		Promise.resolve({ ok: true, status: 200, text: () => Promise.reject(new Error("cut")) })) as unknown as typeof fetch
	expect(await fetchLink(link(null), broken)).toMatchObject({ ok: false, failure: { reason: "unreachable" } })
})
