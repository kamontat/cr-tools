/**
 * Restoring from a link, after cc-tracking's link restore: the browser fetches
 * the address itself, so a site has to allow other sites to read the file.
 * Two sites that people keep a copy on get special care — a GitHub Gist page
 * and a PasteFox page are read from their raw address, and their failures are
 * worded for them. The link is read once and never stored; nothing here
 * writes, and `fetchLink` never rejects.
 */

export type Platform = "gist" | "pastefox" | null

export type ResolvedLink = { url: string; name: string; platform: Platform }

/** PasteFox's own pages, which are not pastes. */
const PASTEFOX_PAGES = ["create", "docs", "login", "signup", "pricing", "about", "api"]

const WITH_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i

function decoded(text: string): string {
	try {
		return decodeURIComponent(text)
	} catch {
		return text
	}
}

/**
 * The address to fetch for what was typed, and the name to give the copy, or
 * null when it is not an address at all (`notAddress`): no http(s) scheme, or
 * a host with no dot that is not `localhost`. A link without a scheme is read
 * over https.
 */
export function resolveLink(input: string): ResolvedLink | null {
	const typed = input.trim()
	if (typed === "") return null
	let url: URL
	try {
		url = new URL(WITH_SCHEME.test(typed) ? typed : `https://${typed}`)
	} catch {
		return null
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") return null
	const host = url.hostname
	if (!host.includes(".") && host !== "localhost") return null

	const segments = url.pathname.split("/").filter((segment) => segment !== "")

	if (host === "gist.github.com" && segments.length === 2) {
		const [user = "", id = ""] = segments
		const anchor = /^#file-(.+)$/.exec(url.hash)?.[1]
		const raw = `https://gist.githubusercontent.com/${user}/${id}/raw`
		if (anchor === undefined) return { url: raw, name: id, platform: "gist" }
		const dash = anchor.lastIndexOf("-")
		const file = dash === -1 ? anchor : `${anchor.slice(0, dash)}.${anchor.slice(dash + 1)}`
		return { url: `${raw}/${file}`, name: file, platform: "gist" }
	}

	if (host === "pastefox.com" && segments.length === 1) {
		const [code = ""] = segments
		if (!PASTEFOX_PAGES.includes(code.toLowerCase())) {
			return { url: `https://pastefox.com/api/pastes/${code}/raw`, name: code, platform: "pastefox" }
		}
	}

	const last = segments.at(-1)
	return { url: url.href, name: last === undefined ? host : decoded(last), platform: null }
}

export type LinkFailure = {
	reason: "unreachable" | "missing" | "private" | "status"
	platform: Platform
	status?: number
}

/**
 * Reads the text at a resolved link. A fetch that never answers is
 * `unreachable`; an error status is `missing` (404, 410) or `private` (401,
 * 403) on Gist and PasteFox, whose pages say so, and `status` everywhere else.
 */
export async function fetchLink(
	link: ResolvedLink,
	fetcher: typeof fetch = fetch,
): Promise<{ ok: true; text: string } | { ok: false; failure: LinkFailure }> {
	const { platform } = link
	try {
		const response = await fetcher(link.url)
		if (!response.ok) {
			const { status } = response
			const reason =
				platform === null
					? "status"
					: status === 404 || status === 410
						? "missing"
						: status === 401 || status === 403
							? "private"
							: "status"
			return { ok: false, failure: { reason, platform, status } }
		}
		return { ok: true, text: await response.text() }
	} catch {
		return { ok: false, failure: { reason: "unreachable", platform } }
	}
}
