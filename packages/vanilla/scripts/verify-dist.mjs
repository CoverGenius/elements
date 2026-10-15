// Checks the built package as a partner consumes it. Run after the package build.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(pkgDir, '../..');
const bin = (name) => join(repoRoot, 'node_modules', '.bin', name);

let failed = false;

function step(name, fn) {
  try {
    fn();
    process.stdout.write(`ok   ${name}\n`);
  } catch (error) {
    failed = true;
    process.stderr.write(
      `FAIL ${name}\n${error.stdout?.toString() ?? ''}${error.stderr?.toString() ?? ''}${error.message}\n`,
    );
  }
}

function node(type, code) {
  execFileSync(process.execPath, [`--input-type=${type}`, '-e', code], { cwd: pkgDir, stdio: 'pipe' });
}

step('node: ESM import with no DOM globals', () => {
  node('module', "await import('./dist/cg-elements.js')");
});

step('node: CJS require with no DOM globals', () => {
  node('commonjs', "require('./dist/cg-elements.cjs')");
});

step('node: registerElements() is a no-op and getElement() is undefined', () => {
  node(
    'module',
    `const m = await import('./dist/cg-elements.js');
     m.registerElements({ environment: 'sandbox' });
     if (m.getElement() !== undefined) throw new Error('getElement() must be undefined without a DOM');`,
  );
});

const fixtureRoot = mkdtempSync(join(tmpdir(), 'cge-verify-'));

try {
  mkdirSync(join(fixtureRoot, 'node_modules', '@covergenius'), { recursive: true });
  symlinkSync(pkgDir, join(fixtureRoot, 'node_modules', '@covergenius', 'elements'), 'dir');

  const source = [
    "import { getElement, registerElements } from '@covergenius/elements';",
    "import type { Client } from '@covergenius/elements';",
    'export const use = (c?: Client) => [c, getElement, registerElements];',
    '',
  ].join('\n');

  writeFileSync(join(fixtureRoot, 'consumer.cts'), source);
  writeFileSync(join(fixtureRoot, 'consumer.mts'), source);
  writeFileSync(
    join(fixtureRoot, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        module: 'node16',
        moduleResolution: 'node16',
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        lib: ['ES2022', 'DOM'],
      },
      include: ['*.cts', '*.mts'],
    }),
  );

  step('tsc: .cts (CJS) and .mts (ESM) consumers compile under node16', () => {
    execFileSync(bin('tsc'), ['-p', fixtureRoot], { stdio: 'pipe' });
  });
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

step('attw: package shape is correct in every resolution mode', () => {
  execFileSync(bin('attw'), ['--pack', pkgDir, '--profile', 'node16', '--exclude-entrypoints', './loader.css'], {
    stdio: 'pipe',
  });
});

if (failed) {
  process.exit(1);
}

process.stdout.write('dist verification passed\n');
