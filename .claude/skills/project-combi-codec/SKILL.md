---
name: project-combi-codec
description: Use when touching src/lib/combi/ — the codec, its character tables, labels, describe.ts, hints.ts, art.ts, the loadout section (loadout.ts, catalog.ts, full-code.ts), or the saved-code and link helpers (state.ts, saved.ts, stats.ts). Required before adding or reordering a mode, goal, episode, boost, random boost, cookie power or action, since the character tables are the wire format.
---

# The combi codec

The combi logic is framework-free TypeScript in `src/lib/combi/`, imported as
`#lib/combi/<module>`, with its tests in `tests/lib/combi/`. None of it touches the DOM, and
none of it imports from `src/components/`, `src/layouts/` or `src/pages/`. The combi page
itself (`src/pages/combi-name/index.astro`) is a placeholder on this branch; the redesign
spec (`docs/superpowers/specs/2026-11-19-site-redesign-design.md`) describes the page that
will use these modules. The wire format does not change in the redesign: `codec.ts`,
`catalog.ts`, `loadout.ts` and `full-code.ts` moved here without behaviour changes.

## The character tables are the source of truth

The character tables at the top of `src/lib/combi/codec.ts` define both the encoding and the
set of valid values, and everything else derives from them:

- `MODE_CHARS` (with `JUMP_CHAR`), `GOAL_CHARS`, `EPISODE_CHARS`, `BOOST_SLOT`,
  `RANDOM_BOOST_CHARS`, `COOKIE_POWER_SLOTS`. Every character is meant to be read: a letter
  from the name of what it holds, a digit where the value is a number, `0` for off. Boosts
  and cookie power+ are `SetSlot`s: one slot holds any set of a few members, a lone member is
  its own letter, and each combination of two or more takes a character from `combos`.
  Boosts are one such slot; cookie power+ is three, one per group of the seven powers. Goals
  are not a `SetSlot`: only eight sets are allowed, so `GOAL_CHARS` lists each one, keyed by
  its members in `ALL_GOALS` order, and `ALL_GOAL_SETS` is that list. There is no action
  table: the jump is `J` in the mode slot.
- `ALL_GOAL_SETS`, `ALL_MODES`, `ALL_EPISODES`, `ALL_BOOSTS`, `ALL_RANDOM_BOOSTS` and
  `ALL_COOKIE_POWERS` are computed from those tables — never hand-maintain a parallel list.
  `ALL_GOALS` and `ALL_ACTIONS` are the two written out by hand: the goal order is the one
  `GOAL_CHARS`' keys are spelled in, and the actions have no table of their own.
- `EPISODE_LIMITS` / `limitsOf` say what an episode lets a run carry: Special Episodes 1
  and 2 and the Special Exp Episode take no boosts, random boost, cookie power+ or relay; the
  Exp episode no treasures either; Special Episode 2 alone has a floor. `normalize` drops
  what an episode (or a manual run's action) has no room for; `encode` always writes through
  it, `decode` applies it and warns about what it dropped. The relay and treasures are the
  loadout's, so `fitLoadout` in `full-code.ts` drops those, with `loadoutWarnings` beside it.
- `labels.ts` maps every value to a display name. `tests/lib/combi/labels.test.ts` asserts
  key-for-key parity with the `ALL_*` arrays, so a new value cannot ship unlabeled. No error
  or warning the codec raises quotes a display name, so every name lives here, boosts
  included.
- `describe.ts` turns a `Combi` into display rows plus an auto/semi-auto verdict
  (`describeCombi`, `describeBuild`), a `Loadout` into its own rows (`describeLoadout`), and
  a full code into its run chips (`describeRun`). It is the only place that decides how a
  combi or a loadout reads in prose. `entryName` — which appends a note to an entry the site
  has since dropped — stays private to the file, so that note reads the same wherever a
  loadout entry is named.
- `hints.ts` (`hintsFor`) says what each character of a code means, one `CharHint` per
  character, for tooltips on a drawn code. Slot numbers come from the codec's own tables and
  the values from `describe.ts`, so a table that grows cannot leave a stale hint behind. A
  code it cannot decode gets no hints at all rather than half a labelling, which would point
  at the wrong characters. Each hint carries a `group` (the field, so one field's characters
  can be drawn and focused as one run — the treasure group comes as `treasureOrder` then
  `treasure1`-`treasure3`, each with the `.` that closes it) and a `name` (the slot and
  field without the value, for a short label).
- `art.ts` says which cookies or pets each cookie power+ belongs to, so a card can wear their
  faces. Each entry is a list of `{ section, key }` against the catalog's own keys rather
  than wire ids — five powers name one cookie, Serenade of Love the two pets that sing it,
  EXP Party the four cookies that throw it. `BOOST_ART` and `EPISODE_ART` beside it do the
  same for boosts and episodes, naming the authored key each icon is filed under in
  `public/assets/index.json` and resolving it through `catalog.ts`'s `staticImage`. All
  three carry a parity test against the `ALL_*` arrays. The functions take a `base` to
  prefix the icon path with, since the icons are served under `/assets/`. The codec still
  does not model a cookie — this mapping is the page's, not the format's.

To add an episode or cookie power: add it to its character table, its label table, and its
art table in `art.ts` (and to `EPISODE_LIMITS` if it takes less than a full run). Nothing
else needs touching, and tests fail until all three are done. A fifth boost is not that
simple: every set of boosts has its own character in slot 5, so a fifth doubles the sets to
32, which crowds the alphabet. A new cookie power joins one of the three groups and needs
combination characters for every set it makes with that group's members — keep groups
small.

## Ordering is part of the wire format

`Object.keys` order determines the `ALL_*` order for the character tables, and the `members`
order of `BOOST_SLOT` and `COOKIE_POWER_SLOTS` determines `ALL_BOOSTS` and
`ALL_COOKIE_POWERS`. A character is written out per value, never derived from position, so
reordering a `*_CHARS` table moves the chips on a page without changing what a character
means — except for a `SetSlot`, whose `combos` keys spell each set in `members` order, so
reordering members breaks every combination key; and which group a power sits in decides
which slot it is written to. Changing a character moves the wire format. If the slot layout
or a character mapping has to change, bump the format version — `LOADOUT_VERSION` in
`loadout.ts`, the first character of every full code; `decodeLoadout` rejects any other
version outright. The ten combi characters carry no version: the game's field leaves no room
to spend on one, so a bare combi copied out of the game is always read as the current
version. (The version is still `1` after several breaking layout changes; each time the
owner chose a break over a bump. `CHANGELOG.md` records which.)

The layout: 1 mode (`M`, `A`, `S`, or `J` for semi-auto with a jump), 2-3 goal, 4 episode
(`A` for Any), 5 boost set, 6-7 random boost (`00` for none), 8-10 cookie power+ (one set
slot per group: Cheerleader/Special Force/Fairy, Cheesecake/Sea Fairy, Serenade of Love/EXP
Party) — ten characters, `CODE_LENGTH`. On Special Episode 2 slots 5-7 are the floor
instead, `000` for any and `001`-`100`, and slots 8-10 must be `000`; `decode` reads slots
5-10 by the episode in slot 4. `decode` reads slot 1 before anything else, so a code in
another layout is refused there. A full code is always `loadout-combi`, and an empty loadout
is the version alone, so a build with no loadout is `1-` and the ten.

Whatever control writes a set (goals, boosts, cookie powers, a treasure slot's
alternatives) must hand the codec its values in table order, filtered from the options, not
in click order — click order would produce a different code for the same build.

## Semi-auto is derived

`ALL_MODES` carries `semiauto` and `MODE_CHARS` maps it to `S` (and `JUMP_CHAR`, `J`, to
semi-auto with a jump), because a code carrying either has to decode — but a mode picker
offers `ALL_MODES` minus that one. A manual run is `M` and is never touched by this rule; it
never jumps, so `encode` drops a manual run's action. Goals are a set: Score on its own, or
1-3 of Money, Exp and Box. An auto run is offered only the three (`AUTO_GOALS`) and a manual
one all four (`MANUAL_GOALS`), with `SOLO_GOAL` standing alone. `encode` throws on a set
`GOAL_CHARS` has no entry for — Score beside another, or none. A code saying Score beside
`A`, `S` or `J` decodes with a warning. Semi-auto is what `encodeMode` makes of an auto run
when Fast Start, a random boost, a jump action or a relay cookie is in play, so a choice for
it could only disagree with the code those produce.

The relay is the one reason that is not in the ten characters. `isSemiAuto` in `codec.ts`
answers for the combi's own three flags and knows nothing else; `isSemiAutoBuild` in
`full-code.ts` adds the loadout's relay, and it is the one question whose answer needs both
halves. `encode` and `decode` take a `forcedSemiAuto` flag for it — the word "relay" never
reaches the codec, so the caller that knows the reason is also the one that names it in a
warning.

Do not remove `semiauto` from `codec.ts` to match a picker: it is slot 1's `S`, and dropping
it would make every semi-auto code ever written unreadable.

## Which characters a code may use

The separators are chosen for word-wise selection (double-click, Option+Shift+Arrow), which
stops at `-` but not at `_` or `.`. So `-` appears exactly once, between the loadout and the
combi, and the combi half is `[0-9A-Z]` only — `0` is its "off" character (no boosts, `00`
no random boost, none of a power group, `000` any floor, and the padding after a lone goal)
— so the ten characters the game takes select on their own. Inside the loadout, `.`
separates treasure slots, `_` joins a slot's alternatives, and `__` is Any; none of them
breaks a word, so the loadout selects whole. Do not put `-` anywhere but the section
boundary, and do not bring a word-breaking character into either half.

## Hard errors vs soft warnings

`decode` throws only when a code is unreadable: wrong length, an unknown character in a
slot, or a tower floor that is not three digits up to `100` (or slots 8-10 not `000`
there). `decodeLoadout` throws on an unknown version. `decode` returns `{ combi, warnings }`
and never throws when slot 1 (`A` vs `S`) disagrees with the flag slots, when an auto run
says Score, or when a code carries what its episode or mode has no room for, because
hand-typed codes can contradict themselves. `isSemiAuto` is always the authority; `encode`
normalizes slot 1 to match it. Keep that division — a page must be able to show a contradictory
code rather than refusing it.

## The exhaustive test

`tests/lib/combi/exhaustive.test.ts` round-trips all 10,621,776 combinations a code can carry
— every goal set in `ALL_GOAL_SETS`, and what an episode has no room for is not varied — and
asserts encoding yields exactly 5,310,888 distinct codes (the auto/semi-auto character is
derived, so the auto family collapses, and a manual run drops its action). Both numbers are
hardcoded; changing the configuration space means recomputing them, and a mismatch usually
means a table changed size rather than that the test is stale. Both tests carry an explicit
`300_000` ms timeout: their runtime is the size of the format, about 30s each on a laptop.

It covers the combi section only. A loadout's alternative treasure slots make its space
open-ended rather than a fixed count to enumerate, so the loadout is instead covered by a
seeded round-trip sample in `tests/lib/combi/full-code.test.ts` — encode 2,000 random
loadouts, decode each back, and check the result re-encodes to the same code.

## The loadout section

`loadout.ts` owns the loadout grammar — `encodeLoadout`, `decodeLoadout`, the fixed `C R P T`
group order, and the `LOADOUT_VERSION` character it opens with, which is the format version
of the whole full code. `catalog.ts` resolves every cookie, relay, pet, and treasure id
against `public/assets/index.json`, imported as `#assets/index.json`. That file doubles as
the wire-format table: its keys are the ids a loadout carries on the wire, so a key must
never be renumbered once a code could have used it. It has no version character, so the
promise is kept by where an id comes from instead: it is the entry's own number on
cookierunhub.com in base 36 (a blessed treasure's is its unblessed form's plus 23,328), so
nothing in this repository assigns one, and `verifyStructure`, run over the committed file by
the suite, checks every id against the page its `url` names. An entry the site stops listing
is kept and marked `retired`, never deleted (see the `project-assets` skill).
`full-code.ts` joins the two sections into `loadout-combi`; a page encodes and decodes
through `encodeFull` / `decodeFull` exclusively, never calling `encodeLoadout` /
`decodeLoadout` or `encode` / `decode` itself.

Encoding a loadout always writes its canonical form: ids sorted within a slot, whole slots
sorted against each other whenever the order flag is `U` (order doesn't matter), and a
single slot always written `U` since there is nothing to order. `decodeLoadout` has no
warning path, but it is just as forgiving of a non-canonical code in its own way: it decodes
one exactly as written rather than rejecting it, and only re-encoding snaps it back to
canonical form. So a page showing a treasure slot's order must read the order flag the
decoded code carries (`loadout.ordered`), not the switch that asked for it.

Each treasure id may be followed by a level: nothing for +0, one digit for one level, two
for a run `min` then `max`. `Loadout.treasures` holds `TreasurePick { id, levels }` for it,
built with `treasurePick`, where `levels` is a set — any levels at all, never none. A set
that is not one run goes on the wire as one copy of the id per run (`levelRuns` finds
them), lowest first, so `0FZ02_0FZ59` is 0FZ at +0-2 or +5-9. Decoding merges every copy of
an id in a slot back into one pick; encoding rejects a slot that lists an id twice. Canonical
form writes maximal runs, +0 as nothing and a one-level run as one digit; within a slot
picks sort by id alone, while unordered slots sort by their whole written string, levels
included. No digits reading as +0 is what keeps every earlier code meaning what it did.

`catalog.ts`'s `anyIdFor` is `_` repeated to the section's width — the "anything fits here"
a cookie, relay or pet slot can carry. It is a value the wire format carries: `encodeLoadout`
and `decodeLoadout` skip `checkId` for it in the `C`, `R` and `P` groups only, and
`isEmptyLoadout` counts a slot holding it as filled. `labelFor` names it ("Any cookie", "Any
pet"); `hasId` denies it. `_` is outside the `[0-9A-Z]` alphabet every id is written in, so no
growth of the catalog can collide with it.

`optionsFor("treasures")` leaves out retired entries and any family named in
`HIDDEN_TREASURE_FAMILIES` (empty today) — but a code can still carry one, so a picker must
add any carried id the offered list lacks to its own options before writing the pick, or
opening a saved link quietly drops a treasure. A treasure's kind (`kindFor`: `base`,
`evolved` or `blessed`, from the index's `N` / `E` / `B`) is display only: no slot of the
wire format holds it.

## Scope

The combi section does not model the cookie, relay, pet, or treasure: the game already
stores those four in the combi, which is precisely why the ten characters are spent on
everything else. Don't add them to `codec.ts`. The loadout section is the exception — it
exists to model exactly those four, for a code that needs to carry them anyway.

## Where a code lives between visits

`state.ts` reads and writes a code in two places, neither trusted on the way back in: the
address bar (`codeInHash`, `hashFor`), so a build is a link someone can send, and
`localStorage` under `combi-name:code` (`storedCode`, `rememberCode`), so closing the tab
does not throw the last build away. `startingCode` lets a link win over the remembered code.
A shared link's hash is `#CODE?note=…&money=12000-15000&time=245` (`shareHashFor`): the note
is base64url of its UTF-8 bytes, so no space, `+` or `%` gives a chat app a place to cut the
link, and a value that does not read is no note (`noteInHash`); stats ride as plain
parameters (`statsInHash`). Old links in that shape must keep opening — it is one of the
redesign's anti-goals. Every storage call takes the `Storage` as an argument and is wrapped,
so a browser that refuses storage still works for that visit. `state.ts` also holds the
current page's tab and full-code keys (`combi-name:tab`, `combi-name:full-code`), which the
redesign may drop.

`saved.ts` is the saved list under `combi-name:saved`: `{ code, description, stats?,
savedAt }` entries, newest first, one per code — the code is the entry's identity, so saving
a code again replaces its entry, and `updateSaved` refuses (`reason: "taken"`) to move an
entry onto a code another holds. An entry not in that shape is dropped on read; a malformed
stat is dropped rather than the entry. `filterSaved`, `sortSaved` (`SAVED_SORTS`, remembered
under `combi-name:saved-sort`), `runFacets` and `facetValues` are views only: they never
reorder what is stored. `formatSaved` writes the export text (each code on its own line, its
stats under it, its note quoted with `>`), and `parseSaved` / `importSaved` read it back,
taking bare codes and shared links too, canonicalising each code through `decodeFull` /
`encodeFull`, and adding only codes not already saved. `stats.ts` holds Score, Money, Exp
and Boxes as `{ min, max }` ranges and Time as seconds; the redesign converts these ranges
into rounds (see the spec), so read it before changing them.

`README.md` documents the slot format, and the loadout grammar, for humans.
