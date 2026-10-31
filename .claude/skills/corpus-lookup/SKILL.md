---
name: corpus-lookup
description: Answer a product, domain, or integration question from context/ or docs/ without loading the corpus into context. Use before any Read, Glob, or Grep under context/, and whenever you need an EVO/Dataverse payload shape, a field or enum name, mock-fixture structure, PRD or CRM detail, or an FR/NFR/ADR id.
---

# Corpus lookup

`context/` holds ~32M tokens across 213 files. Reading from it carelessly is the
most expensive mistake available in this repo: every token a tool result returns
stays resident and is re-billed on **every later tool call** in the session.

32 of those files exceed 50k tokens each. `Read` caps at 2000 lines, so it will
not crash — it will quietly return a meaningless fragment of one JSON array and
charge for it for the rest of the session.

## Rules

1. **Never `Read` a corpus JSON file.** Use `scripts/shape.sh` to get its
   schema instead. Run `scripts/index.sh` if unsure whether a file is safe.
2. **Never `Grep`/`Glob` with `path: context/`** unscoped. Target the
   subdirectory and cap the output.
3. **Delegate multi-file corpus questions to a subagent.** The dumps die with
   the subagent; only the answer survives. Measured here: ~865 tokens for a
   subagent answer against ~3,172 for one `Read`.
4. **Prose is safe.** `docs/*.md` and `context/**/*.md` are small — `Read` them
   directly. The hazard is JSON.
5. **Quote every corpus path.** Some contain spaces, e.g.
   `context/ShoppingAppConnectionDetails/Microsoft Dataverse/`.

## Getting a payload's shape

`scripts/shape.sh` prints key paths and value types, never data. It samples one
array element before deriving paths, so cost does not scale with record count —
the 63MB `catavail-2027.full.json` returns in ~3s.

```bash
.claude/skills/corpus-lookup/scripts/shape.sh <file.json> \
  [--grep PATTERN] [--max N] [--sample N]
```

Examples below shorten that to `scripts/shape.sh`; run it from the repo root
with the full path above.

```bash
# what fields does this endpoint return?
scripts/shape.sh "context/ShoppingAppConnectionDetails/VKG.API.GetShipMap/ResponseBody/response.sample.json"

# just the pricing fields — the usual case, ~15 tokens instead of ~15,000
scripts/shape.sh context/mock-data/catavail-2027.full.json --grep price
```

Output is capped at 200 paths; it tells you how many it withheld. Narrow with
`--grep` rather than raising `--max`. Use `--sample N` when record 0 is sparse
and you suspect optional fields.

To see real value formats, pull exactly one record — never the collection:

```bash
jq '.[0]'          <file>   # array-shaped payload
jq '.results[0]'   <file>   # object-shaped; check the wrapper key via shape.sh
```

## When a fixture is an LFS pointer

`context/mock-data/*.full.json` is Git LFS-tracked. Without the objects
fetched, the file on disk is a 133-byte pointer, not JSON. `shape.sh` detects
this and exits 3 telling you the real size and the fetch command:

```bash
git lfs pull --include='context/mock-data/catavail-2027.full.json'
```

`index.sh` reads the true size out of the pointer, so its verdict is right
either way. Do not fetch a 66MB fixture just to learn a field name — the
same fields appear in the much smaller
`context/ShoppingAppConnectionDetails/VKG.API.GetCategoryPricingAvailability/`
sample, which is ordinary git content.

## Knowing what is safe

`scripts/index.sh [dir]` ranks every corpus file by estimated token cost and
labels it `NEVER-READ` (>50k), `shape.sh` (>5k), or `ok-to-read`. Sizes are
computed live, so this does not go stale.

## Finding which file holds a fact

```bash
ls context/ShoppingAppConnectionDetails/            # endpoints, one dir each
rg -l --glob '!context/mock-data/**' 'updateCabinHold' context/ | head
rg -m3 -C1 'StateroomHold' context/ShoppingAppConnectionDetails/ | head -20
```

Corpus naming rarely matches what you would guess — the cabin-hold operation is
`updateCabinHoldRelease` in `context/Related-APIs/` and `StateroomHoldRelease`
in `Connections.json`. Search a stem (`Hold`, `Price`) before a full name.

Always exclude `context/mock-data/**` from content searches — matches there are
data, not schema, and there are millions of them.

## Where facts live

| You need | Look in |
|---|---|
| EVO / Dataverse request + response shapes | `context/ShoppingAppConnectionDetails/<VKG.API.*>/` |
| EVO method semantics, mappings, endpoint lists | `context/Related-APIs/` (prose — safe to Read) |
| Fixture data the mock adapters mirror | `context/mock-data/` — shape only |
| PRD, domain intros, CRM data model | `context/*.md` (safe to Read) |
| FR/NFR ids | `docs/requirements.md` |
| ADR-001…007 | `docs/decisions.md`; ADR-0008+ in `docs/adr/` |
| Contract specs | `docs/contracts.md` |
| Glossary | `CONTEXT.md` (root) |

`context/README.md` is small and indexes the rest — start there.

## Do not settle these from the corpus

Cabin-hold duration, Saved Search editability, FR1.1 date entry and the
nights 0/0 default are **disputed or pending Viking confirmation**. The corpus
contains conflicting values. Surface the conflict instead of picking one — see
`AGENTS.md` § 10.

Wire schemas are additive-safe by design (`AGENTS.md` § 4.4): a field absent
from one sample may still be valid. Do not conclude a field is unsupported from
one payload.
