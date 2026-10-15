import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const PKG_DIR = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const pkg = JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf8'));
const root = pkg.exports['.'];

describe('package.json exports', () => {
  it('is an ESM package', () => {
    expect(pkg.type).toBe('module');
  });

  it('import condition resolves ESM runtime and ESM types', () => {
    expect(root.import).toEqual({ types: './dist/index.d.ts', default: './dist/cg-elements.js' });
  });

  it('require condition resolves CJS runtime and CJS types (.d.cts)', () => {
    expect(root.require).toEqual({ types: './dist/index.d.cts', default: './dist/cg-elements.cjs' });
  });

  it('puts "types" before "default" in each condition (TypeScript takes the first match)', () => {
    expect(Object.keys(root.import)[0]).toBe('types');
    expect(Object.keys(root.require)[0]).toBe('types');
  });

  it('keeps top-level fallbacks for tooling that ignores exports', () => {
    expect(pkg.main).toBe('./dist/cg-elements.cjs');
    expect(pkg.module).toBe('./dist/cg-elements.js');
    expect(pkg.types).toBe('./dist/index.d.ts');
  });

  it('still exports loader.css and ships dist', () => {
    expect(pkg.exports['./loader.css']).toBe('./dist/loader.css');
    expect(pkg.files).toContain('dist');
  });

  it('never points the require condition at the ESM declaration file', () => {
    expect(root.require.types).not.toBe(root.import.types);
  });
});

describe('vite build config', () => {
  it('copies the rolled-up declarations to index.d.cts after the dts rollup', () => {
    const config = readFileSync(join(PKG_DIR, 'vite.config.ts'), 'utf8');

    expect(config).toContain('afterBuild');
    expect(config).toContain('dist/index.d.cts');
  });
});
