# Cookie Run combi codes

A Cookie Run combi stores a cookie, relay, pet, and treasure, but nothing else — the run's goal, whether it plays itself, the episode, boosts, and cookie power+ selections would otherwise live only in your head. The combi name is 10 characters, which is enough room to carry all of it. An optional loadout section goes further still, writing down the cookie, relay, pet, and treasure choices themselves, so a whole build travels as one code even without the game in front of you.

Every slot is something you can read at a glance: a letter from the name of what it holds, a digit where the thing is a number, and `0` for off or none.

## Format

```
slot:  1  2-3  4  5  6-7  8  9  10
       M  GG   E  B  RR   P  P  P
ex:    J  MX   3  5  RV   F  W  0
SE2:   A  X0   T  0  42   0  0  0
```

| Slot | Field         | Encoding                                                                                                                                                                                                           |
| ---- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Mode          | `M` Manual, `A` Auto, `S` Semi-auto, `J` Semi-auto with a jump at the start                                                                                                                                        |
| 2-3  | Goal          | Two characters for the set of goals, below                                                                                                                                                                         |
| 4    | Episode       | `A` Any, `1`-`7` Episode 1-7, `C` Special Episode 1 (Island of Coins), `T` Special Episode 2 (Tower of Frozen Waves), `R` Special Episode 3 (Mysterious Rabbit Hole), `X` Special Exp Episode (XP-Elixir Workshop) |
| 5    | Boosts        | One character for the whole set, below                                                                                                                                                                             |
| 6-7  | Random boost  | `00` none, otherwise two characters for one of the eleven below                                                                                                                                                    |
| 8-10 | Cookie power+ | One slot per group of powers, below                                                                                                                                                                                |

The combi name is letters and digits only: the game field takes it as is, and a `-` inside it would read as the section separator below. There is no version character among the ten: the format version is the full code's, the first character of the loadout section below.

The starting action has no slot of its own. A jump at the start is one more thing a hand does, so it is `J` in the mode slot — a semi-auto run that jumps. A manual run never jumps: encoding one drops its action.

### Goals (slots 2-3)

A run aims for Score on its own, or for one to three of Money, Exp and Box. An auto run never aims for Score — Score is played by hand.

| Chars | Goals           | Chars | Goals             |
| ----- | --------------- | ----- | ----------------- |
| `S0`  | Score           | `MX`  | Money + Exp       |
| `M0`  | Money           | `MB`  | Money + Box       |
| `X0`  | Exp (X for eXp) | `XB`  | Exp + Box         |
| `B0`  | Box             | `AA`  | Money + Exp + Box |

A code that says Score beside `A`, `S` or `J` still decodes, with a warning.

### Boosts (slot 5)

Each of the sixteen sets of boosts has a fixed character. A single boost is its own letter and all four is `A`. HP Extension with Power Jelly — the pair most runs take — is `2`, and with Double XP as well `3`; the other pairs and triples take the characters left, in order:

| Char | Boosts            | Char | Boosts                     | Char | Boosts                                  |
| ---- | ----------------- | ---- | -------------------------- | ---- | --------------------------------------- |
| `0`  | none              | `2`  | HP Extension + Power Jelly | `3`  | HP Extension + Power Jelly + Double XP  |
| `H`  | HP Extension      | `1`  | HP Extension + Fast Start  | `8`  | HP Extension + Power Jelly + Fast Start |
| `P`  | Power Jelly Boost | `4`  | HP Extension + Double XP   | `9`  | HP Extension + Fast Start + Double XP   |
| `F`  | Fast Start        | `5`  | Power Jelly + Fast Start   | `B`  | Power Jelly + Fast Start + Double XP    |
| `X`  | Double XP         | `6`  | Power Jelly + Double XP    | `A`  | all four                                |
|      |                   | `7`  | Fast Start + Double XP     |      |                                         |

Cookie Relay is not here: a run that uses one says so by naming a relay cookie in the loadout section.

### Random boost (slots 6-7)

Two characters from each boost's name, or its number where it has one.

| Chars | Boost                    | Chars | Boost                 |
| ----- | ------------------------ | ----- | --------------------- |
| `00`  | none                     | `GC`  | Gold Coin Magic       |
| `2C`  | Double Coins             | `CO`  | -30% Collision Damage |
| `BS`  | +15% Score (bonus score) | `PO`  | +20% HP from Potions  |
| `HD`  | 15% HP Drain             | `MA`  | Magnetic Aura         |
| `RV`  | Revive once with 80 HP   | `PL`  | 2 Pit Lifts           |
| `CC`  | 70% Crush Chance         |       |                       |
| `17`  | +17% Base Speed          |       |                       |

### Cookie power+ (slots 8-10)

Any number of the seven can be on, so they are split into three groups with a slot each. A slot works like the boost slot: `0` for none of its group, a power's own letter when it is the only one of its group, a running digit for some but not all of a group, and `A` for the whole group — as all four boosts are `A`.

| Slot | Powers                                        | Combinations                             |
| ---- | --------------------------------------------- | ---------------------------------------- |
| 8    | `C` Cheerleader, `S` Special Force, `F` Fairy | `1` C+S, `2` C+F, `3` S+F, `A` all three |
| 9    | `K` Cheesecake, `W` Sea Fairy (W for water)   | `A` both                                 |
| 10   | `L` Serenade of Love, `E` EXP Party           | `A` both                                 |

Fairy plus Sea Fairy is `FW0`; Cheerleader, Fairy and EXP Party is `20E`; all seven is `AAA`.

### Special episodes

Some episodes take less than a full run:

| Episode                   | Takes                                     |
| ------------------------- | ----------------------------------------- |
| Special Episode 1 (`C`)   | cookie, pet, treasures                    |
| Special Episode 2 (`T`)   | cookie, pet, treasures, and a tower floor |
| Special Exp Episode (`X`) | cookie and pet                            |

None of the three takes a relay, boosts, a random boost, or cookie power+, so slots 5-10 read `0`. Special Episode 2 spends slots 5-7 on the floor instead — `001` to `100`, or `000` for any floor — and slots 8-10 stay `000`. The mode and goal apply as they do anywhere else.

Encoding drops what the episode has no room for. Decoding a code that carries it anyway drops it too, with a warning, rather than refusing the code.

## Loadout section

A full code is `loadout-combi`: the loadout section, a `-`, then the ten-character combi name exactly as above. The loadout section always opens with the format version, so a full code with no loadout is the version alone before the `-`: `1-MS0A000000`. A bare ten-character code — copied back out of the game, with no `-` and no version — still decodes, read as the version this page writes.

The separators are picked for word-wise selection (double-click, or Option+Shift+Arrow). Editors and browsers stop a word at `-` but not at `_` or `.`, so the loadout selects as one word and the combi name — the part you paste into the game — as another.

The loadout writes down the cookie, relay, pet, and treasure a build uses. The game already stores those four in its own combi field, so a loadout is never required — add one when you want a build to travel as text on its own, without a screenshot or the game alongside it.

| Tag | Group     | Encoding                                                                                                                                                                                                                                                       |
| --- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1` | Version   | The format version of the whole code; the ten combi characters carry none of their own. Always present, even with no group after it                                                                                                                            |
| `C` | Cookie    | 2-character catalog id, or `__` for any cookie                                                                                                                                                                                                                 |
| `R` | Relay     | 2-character catalog id, the same catalog as cookie, or `__` for any relay                                                                                                                                                                                      |
| `P` | Pet       | 2-character catalog id, or `__` for any pet                                                                                                                                                                                                                    |
| `T` | Treasures | An order flag (`U` any order, `O` exact order), then up to three slots of 3-character ids joined by `.`; alternatives within a slot are joined by `_`, and each id may be followed by a level — a treasure whose levels are not one run is listed once per run |

`C`, `R`, `P`, and `T` are each written at most once and, when present, always in that order. A group that has nothing to say is simply missing — there is no placeholder character for "unset."

"Any" is not that placeholder, and the difference is the point: a missing group is a build that never mentions the slot, while `__` is one that says anything fits there. `_` is outside the `[0-9A-Z]` alphabet ids are drawn from, so it can never collide with a catalog id however far the catalog grows. Only `C`, `R`, and `P` accept it — a treasure slot already holds a list of acceptable alternatives, which is a different idea, and `TU___` is rejected like any other malformed id (there `_` is the alternative separator, so it reads as empty ids).

An `R__` counts as a relay for everything a named relay counts for: the build is semi-auto, and slot 1 is written `S`. Which cookie relays in is not what makes the run need a hand.

```
1-MS0A800FW0                       no loadout
1C2L-MS0A800FW0                    a cookie only
1C__R__P__-SM0A000000              any cookie, any relay, any pet
1C2LR0BP1ZTU09F_0G2.0G1-JM031RV000 cookie, relay, pet, two treasure slots, any order
1TU09F02_09F59_0G23.0G19-MS0A000000 slot 1: 09F at +0-2 or +5-9, or 0G2 at +3; slot 2: 0G1 at +9
```

Encoding always writes the canonical form: ids are sorted within a slot, and whole slots are sorted against each other whenever the order flag is `U` — a single slot is always written `U`, since there is nothing to order with only one slot. That is what keeps one build to exactly one code. Reading a code is more forgiving: a hand-written or otherwise non-canonical loadout still decodes correctly, it just re-encodes into the canonical form rather than back into what you typed.

Every id — cookie, relay, pet, or treasure — is a catalog id from `public/assets/index.json`, `__` aside. An id is the entry's own number on [cookierunhub.com](https://www.cookierunhub.com/en/encyclopedia) in base 36 — treasure 50 is `01E`, and its page is `/en/encyclopedia/treasures/50`. A blessed treasure has no number of its own there, so it takes its unblessed form's number plus 23,328, half the 3-character space: the blessed form of `01E` is `I1E`. Because the site owns the numbering, a code you write today keeps naming the same cookie, pet, or treasure for as long as the site keeps its pages, and an entry the site stops listing stays in the catalog, marked retired, so a code carrying it still reads.

Within one slot, an id repeats only to list another run of its levels, and reading a code merges every copy of an id in a slot into one treasure — so `TU09F_09F` is simply 09F at +0, and `TU09F03_09F25` is 09F at +0-5. The same id may also repeat across two different slots: that is how overlapping alternatives are written.

### Treasure levels

A treasure is upgraded from +0 to +9, and each treasure in a slot says which levels it is accepted at. The level follows its id directly — ids are always three characters, so it needs no separator:

| Written       | Levels                 |
| ------------- | ---------------------- |
| `09F`         | +0, not upgraded       |
| `09F5`        | +5                     |
| `09F58`       | +5 to +8               |
| `09F09`       | +0 to +9, any level    |
| `09F9`        | +9                     |
| `09F02_09F59` | +0 to +2, and +5 to +9 |
| `09F_09F9`    | +0 and +9              |

No digits means +0, which is also how every code written before levels existed reads. A treasure whose levels are not one run repeats its id once per run, lowest first. Encoding writes the shortest form: runs are merged, a one-level run is one digit, and +0 is nothing. A range that runs backwards, like `95`, is rejected.

## Auto vs semi-auto

Semi-auto is an auto run that needs manual work each time. An auto build is semi-auto when **any** of these is true: Fast Start is on (slot 5), a random boost is selected (slots 6-7), the run jumps at the start (`J` in slot 1), or the loadout carries a relay cookie (the `R` group, `R__` included) on an episode that takes one. The other three boosts do nothing to it — Double XP included, since it changes what a run pays out rather than what it asks of you.

The relay is the one reason that lives outside the ten characters: a relay cookie is swapped in by hand, so a run carrying one never plays itself through. Slot 1 is written from the whole build, so the ten characters you paste into the game say `S` when a relay is in front of them — while a bare combi code, having no loadout to read, answers for its own three flags alone.

Slot 1 stores `A`, `S` or `J` for readability, but those four reasons are the authority. `encodeFull` normalizes slot 1 so a generated code never contradicts itself. `decodeFull` accepts a hand-typed code that does contradict, keeps `combi.mode` as written, and returns a warning; `isSemiAutoBuild` always answers from the fields above.

```
AM03H00000   full auto, money (HP Extension only)
AAA3H00000   full auto, money + exp + box
AM03200AAA   full auto, money (HP Extension + Power Jelly, every cookie power+)
SM031RV000   semi-auto (HP Extension + Fast Start, Revive)
JX03H00000   semi-auto (jump only)
AB03400000   full auto, box (HP Extension + Double XP)
AM0T042000   full auto on the tower, floor 42
```

## Usage

```ts
import { encode, decode, isSemiAuto } from "./src/lib/combi/codec"

encode({
  goals: ["score"],
  mode: "manual",
  episode: "any",
  floor: null,
  boosts: ["hpExtension", "powerJellyBoost", "fastStart"],
  randomBoost: null,
  cookiePowers: ["fairy", "seaFairy"],
  action: "none",
})
// "MS0A800FW0"

const { combi, warnings } = decode("JX035RVC0E")
isSemiAuto(combi) // true
```

`decode` throws on a code it cannot read — wrong length, an unknown character in a slot, or a tower floor that is not `000`-`100`. Everything else is soft and comes back in `warnings`: slot 1 disagreeing with the flag slots, Score on an auto run, or anything the episode has no room for. `encode` throws on a set of goals no code can say: Score beside another goal, or none at all.

## Web app

The site is being rebuilt on Astro and Svelte, with saved codes as the combi page's main content, a left sidebar, a Settings page, Thai and English, and backup and restore for saved data. The design is [`docs/superpowers/specs/2026-11-19-site-redesign-design.md`](docs/superpowers/specs/2026-11-19-site-redesign-design.md). The work lands on the `redesign` branch piece by piece; `main` serves the previous site until the new combi page is complete. On `redesign` the pages — Home at `/`, the combi tool at `/combi-name/`, and Settings at `/settings/` — are placeholders for now, while the codec and everything around it are in place under `src/lib/combi/`.

The format does not change in the redesign. Links already shared, such as `/combi-name/#CODE?note=…`, keep opening the same code with its note and stats.

## Development

```bash
bun install
bun run dev           # astro dev on :4321
bun run test          # vitest, including an exhaustive round-trip over all 10,621,776 combis
bun run check         # astro check, then Biome
bun run format        # Biome with --write --unsafe
bun run build         # static HTML into dist/, one folder per page, icons under dist/assets/
bun run preview       # serves the built dist/; build first
bun run verify:assets # asks cookierunhub.com whether public/assets/index.json is still complete
```

The exhaustive test asserts that encoding produces exactly 5,310,888 distinct codes — 10,621,776 inputs collapse to that many because the auto/semi-auto character is derived rather than free, and a manual run drops its action. Vitest runs the tests under `tests/` in two projects: `tests/components/` and `tests/lib/` in happy-dom, everything else without a DOM.

`bunfig.toml` runs Astro and Vitest on Bun rather than Node.js, and pins every dependency to an exact version; `mise.toml` pins Bun itself.

### Layout

| Path              | Role                                                                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/`      | One Astro page per route: `index.astro`, `combi-name/index.astro`, `settings/index.astro`. Each builds as a folder, `dist/<slug>/index.html`.                                 |
| `src/layouts/`    | `BaseLayout.astro`: the `<html>` shell, title, favicon, global CSS and Google Tag Manager every page renders inside.                                                          |
| `src/components/` | Components in atomic tiers — `atoms/`, `molecules/`, `organisms/` — as `.astro` or `.svelte` files.                                                                           |
| `src/lib/combi/`  | The combi logic, with no DOM and no framework: the codec and its tables, labels, descriptions, hints, the catalog, the loadout and the full code, and the saved-code helpers. |
| `src/lib/`        | Other shared TypeScript: the tool registry, build details, Google Tag Manager, panel widths.                                                                                  |
| `src/styles/`     | Global CSS.                                                                                                                                                                   |
| `public/assets/`  | Cookie, pet, treasure, boost and episode icons, served at `/assets/...`, and `index.json`, the catalog the loadout's ids come from.                                           |
| `scripts/`        | The two asset programs: `fetch-assets.ts` syncs from cookierunhub.com, `verify-assets.ts` asks the site whether the committed index is still complete.                        |
| `tests/`          | Every test, mirroring `src/` and `scripts/`.                                                                                                                                  |

The `ALL_*` arrays and the label tables derive from the character tables in `src/lib/combi/codec.ts`, and a test asserts every value has a label, so adding a goal or episode cannot silently ship a page with a missing option.

## Deployment

The site is a Cloudflare Worker serving the static files in `dist/`. `wrangler.jsonc` points it at `dist/` and has wrangler run `bun run build` itself, so the deploy workflows do not build beforehand. Production is <https://cr-tools.kc.in.th>; each pull request gets a preview at `https://pr-<number>-cr-tools.kcinth.workers.dev/`.

`.github/workflows/main.yml` runs both checks, the build and the tests on every push. `deploy-preview.yml` uploads a preview version for every pull request; `deploy-production.yml` deploys on every push to `main`. Both tell the build which environment and commit it is (`PUBLIC_DEPLOY_ENV`, `PUBLIC_COMMIT_SHA`, `PUBLIC_BUILT_AT`, and for previews the PR number and branch), and production alone passes the Google Tag Manager container. Both need `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in repository secrets. `assets.yml` checks weekly that the committed catalog still matches cookierunhub.com.
