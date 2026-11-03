/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import { copyFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

function copyLoaderCss() {
  return {
    name: 'copy-loader-css',
    closeBundle() {
      copyFileSync(
        resolve(import.meta.dirname, 'src/styles/loader.css'),
        resolve(import.meta.dirname, 'dist/loader.css'),
      );
    },
  };
}

// Library build: ESM + CJS, plus bundled .d.ts so partners get full types
// whether they consume from TS or plain JS.
export default defineConfig({
  plugins: [
    dts({
      rollupTypes: true,
      exclude: ['src/__tests__/**'],
      // TypeScript reads index.d.ts as ESM, so the `require` condition needs its own .d.cts.
      // A verbatim copy is only valid while the declarations have no default export.
      afterBuild: () => {
        copyFileSync(resolve(import.meta.dirname, 'dist/index.d.ts'), resolve(import.meta.dirname, 'dist/index.d.cts'));
      },
    }),
    copyLoaderCss(),
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'CGElements',
      fileName: (format) => (format === 'es' ? 'cg-elements.js' : 'cg-elements.cjs'),
      formats: ['es', 'cjs'],
    },
    sourcemap: false,
    rolldownOptions: { output: { strict: true } },
  },
  test: {
    environment: 'happy-dom',
    restoreMocks: true,
    // CI containers often report more CPUs than they can use.
    maxWorkers: process.env.CI === 'true' ? 3 : undefined,
    // Generates the inlined theme stylesheet that src/core/element.ts imports.
    globalSetup: ['./scripts/vitest-global-setup.ts'],
  },
});
