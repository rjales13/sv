# Figma Code Connect — VA Patterns Reference

## Size mapping convention

Figma DS has four size names; React components use shorter names:

| Figma `Size` | React prop | Height |
|---|---|---|
| `x-lg` | `'xl'` | 44 px |
| `lg-default` | `'default'` | 40 px |
| `md` | `'sm'` or `'md'` | 32 px |
| `sm` | `'xs'` or `'sm'` | 24 px |

Check the target component's type definition — some use `'sm'/'xs'` (Input, InputDate), others use `'md'/'sm'` (QuantityStepper). When a component only has two sizes (SelectTrigger), collapse both ends: `'x-lg'/'lg-default' → 'default'` and `'md'/'sm' → 'sm'`.

---

## Parser hard constraints

The Code Connect parser rejects these constructs and gives a cryptic "Could not find prop mapping" or "second argument should be an object literal" error:

1. **`figma.enum` second arg must be an inline object literal — no variable references.**
   ```tsx
   // ❌ Rejected
   const SIZE = { 'x-lg': 'xl' };
   figma.enum('Size', SIZE)

   // ✅ Required
   figma.enum('Size', { 'x-lg': 'xl', 'lg-default': 'default', md: 'sm', sm: 'xs' })
   ```

2. **Ternary expressions with non-literal values are rejected.**
   ```tsx
   // ❌ Rejected — new Date() is not a literal
   defaultValue={filled ? new Date('2026-08-01') : undefined}
   ```
   Solution: use a variant-filtered second connection for the "Filled" state.

3. **Conditional `&&` JSX rendering is rejected.**
   ```tsx
   // ❌ Rejected
   {invalid && <FieldError>{msg}</FieldError>}
   ```
   Solution: use a variant-filtered second connection for the "Error" state.

---

## One connection vs two connections

**Use a single `figma.connect()`** when all Figma variant states produce the same JSX shape — only prop values differ.
- Example: `InputRadio` Unselected/Disabled — same shape, just `disabled` toggles.

**Add a variant-filtered second `figma.connect()`** when the JSX structure must differ between states — elements added or removed, or non-literal values required.
- Example: Error states → adds `<FieldError>` below the control.
- Example: Filled states → `defaultValue={new Date(...)}` on `InputDate`.
- Example: Selected state on `RadioGroupItem` → wraps in `<RadioGroup defaultValue="option-1">`.

Variant filter syntax:
```tsx
figma.connect(Component, URL, {
  variant: { State: 'Error' },
  props: { ... },
  example: (...) => <JSX />,
});
```

---

## Label wrapping pattern

For input controls that visually pair with a label above them:

```tsx
<div className="flex flex-col gap-1.5">
  <Label htmlFor="field">{label}</Label>
  <TheControl id="field" ... />
</div>
```

When the control is a `role="group"` (e.g. `QuantityStepper`, `RadioGroup`) and cannot accept `id`, skip `htmlFor` / `id` and use `aria-label` on the control instead:

```tsx
<div className="flex flex-col gap-1.5">
  <Label>{label}</Label>
  <TheControl aria-label={label} ... />
</div>
```

---

## Error row pattern

Always use a variant-filtered connection for the Error state — do not try conditional rendering inside a single example:

```tsx
figma.connect(Control, URL, {
  variant: { State: 'Error' },
  props: {
    errorMessage: figma.string('Error message'),
    // ... other props
  },
  example: ({ errorMessage, ...rest }) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="field">{label}</Label>
      <TheControl id="field" aria-invalid {...rest} />
      <FieldError>{errorMessage}</FieldError>
    </div>
  ),
});
```

`FieldError` is imported from `'./field'`.

---

## Finding the master component node

The URL the user provides often points to a **section/documentation frame** (e.g. "InputRadio — section"), not the master component. `get_context_for_code_connect` returns the real master `nodeId` in its response — use that in the Code Connect URL:

```
URL node-id=44-22  →  get_context_for_code_connect returns nodeId: "44:21"
→  figma.connect URL uses node-id=44-21
```

The Figma URL format uses hyphens: `node-id=44-21` (from colon `44:21`).

---

## Publish command

```bash
cd packages/ui
npx figma connect publish --token "$(grep FIGMA_ACCESS_TOKEN .env.local | cut -d= -f2)"
```

The token is stored in `packages/ui/../.env.local` (project root) as `FIGMA_ACCESS_TOKEN=figd_...`. The `figma.config.json` in `packages/ui` scopes publishing to that package's `.figma.tsx` files.

---

## Full prop mapping reference

| Figma property type | `figma.*` function | Notes |
|---|---|---|
| VARIANT | `figma.enum('PropName', { FigmaVal: codeVal })` | Second arg must be inline object literal |
| TEXT | `figma.string('PropName')` | Returned as `string` |
| BOOLEAN | `figma.boolean('PropName')` | Returns `true`/`false` |
| BOOLEAN mapped to prop | `figma.enum('PropName', { true: 'value' })` | When boolean maps to a union value |

---

## Worked example skeleton

```tsx
import { figma } from '@figma/code-connect';
import { FieldError } from './field';
import { Label } from './label';
import { TheControl } from './the-control';

/*
  Code Connect for VA TheControl (SA-DesignSystem, node XX:YY).
  Size:  x-lg → "xl"  ·  lg-default → "default"  ·  md → "sm"  ·  sm → "xs"
  State: Disabled → disabled  ·  Error → variant-filtered (adds FieldError)
         Focused/Hover → CSS-driven, no prop.
*/

// Non-error states
figma.connect(TheControl, 'https://www.figma.com/design/KHTdpBPOn3ZsJrNelheq5z/SA-DesignSystem?node-id=XX-YY', {
  props: {
    size: figma.enum('Size', { 'x-lg': 'xl', 'lg-default': 'default', md: 'sm', sm: 'xs' }),
    disabled: figma.enum('State', { Disabled: true }),
    placeholder: figma.string('Placeholder'),
    label: figma.string('Label'),
  },
  example: ({ size, disabled, placeholder, label }) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="field">{label}</Label>
      <TheControl id="field" size={size} disabled={disabled} placeholder={placeholder} />
    </div>
  ),
});

// Error state
figma.connect(TheControl, 'https://www.figma.com/design/KHTdpBPOn3ZsJrNelheq5z/SA-DesignSystem?node-id=XX-YY', {
  variant: { State: 'Error' },
  props: {
    size: figma.enum('Size', { 'x-lg': 'xl', 'lg-default': 'default', md: 'sm', sm: 'xs' }),
    placeholder: figma.string('Placeholder'),
    label: figma.string('Label'),
    errorMessage: figma.string('Error message'),
  },
  example: ({ size, placeholder, label, errorMessage }) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="field">{label}</Label>
      <TheControl id="field" size={size} placeholder={placeholder} aria-invalid />
      <FieldError>{errorMessage}</FieldError>
    </div>
  ),
});
```
