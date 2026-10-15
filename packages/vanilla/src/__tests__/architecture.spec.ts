import { readFileSync, globSync } from 'node:fs';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Architecture fitness functions: executable checks of structural invariants
// that keep the SDK clean and partner-auditable as more devs touch it. These
// complement the ESLint filename rule (which catches drift in-editor and in CI)
// by asserting the invariants ESLint can't express as plain tests.

// src/ dir, resolved to a real filesystem path (import.meta.url is not a file:
// URL under the happy-dom test environment, so fileURLToPath it explicitly).
// styles/generated/** is build output (scripts/inline-theme-defaults.ts), not
// authored source, so it is exempt from every invariant below.
const SRC_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const sources = globSync('**/*.ts', { cwd: SRC_DIR }).filter((f) => !f.includes('/generated/'));
const read = (rel: string) => readFileSync(join(SRC_DIR, rel), 'utf8');

describe('architecture invariants', () => {
  it('finds source files to check', () => {
    expect(sources.length).toBeGreaterThan(0);
  });

  it('all source filenames are kebab-case (leading-underscore refs excepted)', () => {
    const kebab = /^_?[a-z0-9]+(-[a-z0-9]+)*(\.spec)?\.ts$/;
    const offenders = sources.map((f) => basename(f)).filter((name) => !kebab.test(name));
    expect(offenders, `non-kebab filenames:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('index.ts is a barrel: re-exports only, no logic', () => {
    const body = read('index.ts')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('//'));

    const declarations = body.filter((l) => /^(export\s+)?(function|class|const|let|var)\s/.test(l));
    expect(declarations, `index.ts should only re-export, found declarations:\n${declarations.join('\n')}`).toEqual([]);
  });

  it('core has no framework imports (React/Vue): it is vanilla', () => {
    const framework = /(from\s+['"](react|react-dom|vue)['"]|require\(['"](react|react-dom|vue)['"]\))/;
    const offenders = sources.filter((rel) => framework.test(read(rel)));
    expect(offenders, `core must stay framework-agnostic; framework import in:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('client and element never reference each other: both talk only to the container', () => {
    // The three-role invariant: the container is the single
    // pivot. If the client imported the element (or vice versa) the passive-leaf
    // model would be broken. Assert the boundary structurally.
    const clientImportsElement = /from\s+['"]\.\/element['"]/.test(read('core/client.ts'));
    const elementImportsClient = /from\s+['"]\.\/client['"]/.test(read('core/element.ts'));

    expect(clientImportsElement, 'core/client.ts must not import core/element.ts').toBe(false);
    expect(elementImportsClient, 'core/element.ts must not import core/client.ts').toBe(false);
  });

  it('data-cg-* names are referenced through shared/attributes.ts, not bare literals', () => {
    // shared/attributes.ts is the single source of truth for the DOM hook names;
    // a bare data-cg-* literal or dataset.cg* access anywhere else drifts from it
    // and dodges the compiler. Tests may assert literals (they prove the contract
    // from the outside), so __tests__ is excluded, as is the source of truth itself.
    // (.css attribute selectors are outside this check: sources is a **/*.ts glob.)
    const bareName = /data-cg-|dataset\.cg[A-Z]/;
    const offenders = sources
      .filter((rel) => !rel.includes('__tests__') && rel !== 'shared/attributes.ts')
      .filter((rel) => bareName.test(read(rel)));

    expect(
      offenders,
      `use CG_ATTR/CG_DATASET from shared/attributes.ts; bare data-cg-* in:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('the data-cg-* hook constants stay internal: not re-exported from the barrel', () => {
    // shared/attributes.ts is an internal contract. Leaking it through index.ts
    // would make CG_ATTR/CG_DATASET/CG_ROLE partner-facing API we owe semver on.
    const leaks = /attributes|CG_ATTR|CG_DATASET|CG_ROLE/.test(read('index.ts'));

    expect(leaks, 'index.ts must not re-export shared/attributes.ts (internal hook contract)').toBe(false);
  });
});
