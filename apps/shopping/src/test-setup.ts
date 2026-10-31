import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Shared DOM-test setup, imported by each `*.test.tsx`. The root Vitest config is
// node-env and sets no `setupFiles` (it stays workspace-generic), so this feature
// arms jest-dom matchers, RTL auto-cleanup, and a few happy-dom polyfills itself.
// The `@vitest-environment happy-dom` docblock at the top of each test file is
// what switches that file to a DOM environment.

// Vitest globals are off in this workspace (tests import from 'vitest'), so RTL
// can't self-register cleanup — do it explicitly to avoid cross-test DOM bleed.
afterEach(() => cleanup());

// Radix primitives (Select, Popover behind MultiSelect/InputDate) reference a few
// browser APIs happy-dom doesn't implement. We only ever RENDER them (closed), so
// no-op stubs are enough to keep a render from throwing; interaction is driven
// through native controls the tests can actually operate.
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub;
}

const elementProto = globalThis.Element?.prototype as
  | (Element & {
      scrollIntoView?: () => void;
      hasPointerCapture?: () => boolean;
      setPointerCapture?: () => void;
      releasePointerCapture?: () => void;
    })
  | undefined;

if (elementProto) {
  elementProto.scrollIntoView ??= () => {};
  elementProto.hasPointerCapture ??= () => false;
  elementProto.setPointerCapture ??= () => {};
  elementProto.releasePointerCapture ??= () => {};
}
