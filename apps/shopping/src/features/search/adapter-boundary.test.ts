import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// FR6.2 static guard (corrected for U7): feature/UI/shared-library code depends only on the
// typed `CruiseSearchProvider` port, never on a concrete adapter. Adapter selection lives in
// exactly ONE place — the composition root under `apps/shopping/src/app/**` (ADR-006) — which
// legitimately imports `@vikings/adapters` and is therefore NOT scanned here.
//
// This corrects U6's original assertion. U6 asserted the app package declares no adapter
// dependency; that is now wrong, because the composition root's package MUST declare it. The
// real rule is about IMPORTS in the wrong LAYER, not about the package manifest — so we scan
// source and additionally assert the manifest DOES carry the dep for the composition root.

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));
const FEATURES_DIR = fileURLToPath(new URL('../', import.meta.url));
const APP_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const FORBIDDEN = '@vikings/adapters';
// An import/re-export specifier for the forbidden package — matches production code, not a
// comment or a string that merely names the package (as the tests and fixtures do when they
// document the boundary).
const FORBIDDEN_IMPORT = /(?:from|import)\s*\(?\s*['"]@vikings\/adapters(?:\/[^'"]*)?['"]/;

// The port-only layers: the search feature plus the shared libraries any feature builds on.
// The composition root (`apps/shopping/src/app`) is deliberately absent — it is the sanctioned
// adapter importer.
const PORT_ONLY_DIRS = [
  FEATURES_DIR,
  `${REPO_ROOT}packages/ui/src`,
  `${REPO_ROOT}packages/contracts/src`,
  `${REPO_ROOT}packages/platform/src`,
];

/** Production `.ts`/`.tsx` under a dir — test files and `.mock.ts` fixtures excluded. */
function productionSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...productionSourceFiles(path));
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|mock)\.tsx?$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

describe('FR6.2 adapter boundary', () => {
  it('no port-only layer (feature/UI/contracts/platform) imports @vikings/adapters', () => {
    const offenders = PORT_ONLY_DIRS.flatMap((dir) => productionSourceFiles(dir)).filter((path) =>
      FORBIDDEN_IMPORT.test(readFileSync(path, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('the app package declares @vikings/adapters (the composition-root exception is legitimate)', () => {
    const pkg = JSON.parse(readFileSync(`${APP_ROOT}package.json`, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const declared = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(Object.keys(declared)).toContain(FORBIDDEN);
  });
});
