import { afterEach, expect, test, vi } from "vitest"

import { downloadText } from "#lib/download"

const url = URL as unknown as { createObjectURL?: unknown; revokeObjectURL?: unknown }
const original = { create: url.createObjectURL, revoke: url.revokeObjectURL }

afterEach(() => {
	url.createObjectURL = original.create
	url.revokeObjectURL = original.revoke
	vi.restoreAllMocks()
})

test("saves text by clicking a temporary download link, then removes it", () => {
	const created = vi.fn((_blob: Blob) => "blob:test")
	const revoked = vi.fn()
	url.createObjectURL = created
	url.revokeObjectURL = revoked
	const clicked: { download: string; href: string; attached: boolean }[] = []
	vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
		clicked.push({ download: this.download, href: this.href, attached: document.body.contains(this) })
	})

	expect(downloadText("cr-tools-2026-11-25.json", "{}")).toBe(true)

	expect(clicked).toEqual([{ download: "cr-tools-2026-11-25.json", href: "blob:test", attached: true }])
	expect(created).toHaveBeenCalledTimes(1)
	expect(created.mock.calls[0]?.[0].type).toBe("application/json")
	expect(document.querySelector("a[download]")).toBeNull()
	expect(revoked).toHaveBeenCalledWith("blob:test")
})

test("a browser that throws gets false, not an error", () => {
	url.createObjectURL = () => {
		throw new Error("no")
	}
	expect(downloadText("a.json", "{}")).toBe(false)
	expect(document.querySelector("a[download]")).toBeNull()
})
