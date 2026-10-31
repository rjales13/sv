---
name: figma-code-connect
description: >
  Create and publish Figma Code Connect mappings that link SA-DesignSystem Figma components
  to their React implementations in packages/ui. Use when the user provides a Figma URL and
  wants to map it to an existing component, or says things like "map [component] from Figma",
  "add code connect for", "create a figma connect", or "publish to Figma".
  Output file: packages/ui/src/components/NAME.figma.tsx. Publish with npx figma connect publish.
---

# Figma Code Connect

## Workflow

Follow these steps in order for each component mapping.

### 1. Fetch design information (parallel)

Call both tools simultaneously:

```
get_context_for_code_connect(fileKey, nodeId)   → master component nodeId + all Figma properties
get_design_context(fileKey, nodeId)              → rendered code, screenshot, prop types, description
```

**Also** read the target React component (`packages/ui/src/components/<name>.tsx`) in the same parallel call so you understand its actual prop interface before writing the mapping.

### 2. Identify the master component node

The URL the user gives often points to a documentation/section frame, not the component. `get_context_for_code_connect` returns the real `nodeId` — use that in the Code Connect URL. Convert colon-format (`44:21`) to hyphen-format (`44-21`) for the URL.

### 3. Write the `.figma.tsx` file

Create `packages/ui/src/components/<component-name>.figma.tsx`.

**Decide: one connection or two?**
- **One** `figma.connect()` when all states produce the same JSX shape (only prop values differ).
- **Two** when JSX structure must differ (Error adds `<FieldError>`, Filled adds non-literal `defaultValue`, Selected changes wrapping component). Add a `variant: { State: 'Error' }` (or other) filtered second connection.

See `references/patterns.md` for:
- Parser hard constraints (inline enum objects, no conditional JSX)
- Size naming convention (x-lg→xl, lg-default→default, md→sm/md, sm→xs/sm)
- Label wrapping and error row patterns
- Full prop mapping reference and worked skeleton

### 4. Publish

```bash
cd packages/ui
npx figma connect publish --token "figd_-WK-pILjzJvq1ce9BmT_OmMNs765BkQSiiDvaLLe"
```

Confirm each published line in the output matches the expected component and variant filters.

---

## Quick reference

| Figma type | figma.* call |
|---|---|
| VARIANT | `figma.enum('Prop', { FigmaVal: codeVal })` — **inline object, no variable** |
| TEXT | `figma.string('Prop')` |
| BOOLEAN | `figma.boolean('Prop')` |

**SA-DesignSystem file key:** `KHTdpBPOn3ZsJrNelheq5z`

**Error import:** `import { FieldError } from './field';`

**Label import:** `import { Label } from './label';`

Read `references/patterns.md` for the size table, parser gotchas, label/error patterns, and the full worked skeleton.
