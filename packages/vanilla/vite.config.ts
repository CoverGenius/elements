/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import { copyFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

function copyLoaderCss() {
  return {
    name: 'copy-loader-css',
    closeBundle() {
      copyFileSync(resolve(__dirname, 'src/styles/loader.css'), resolve(__dirname, 'dist/loader.css'));
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
        copyFileSync(resolve(__dirname, 'dist/index.d.ts'), resolve(__dirname, 'dist/index.d.cts'));
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
  },
  test: {
    // Custom elements need a DOM. happy-dom is lighter/faster than jsdom and
    // handles customElements/HTMLElement for the SDK's element + resolver tests.
    environment: 'happy-dom',
    // core/element.ts imports the build-time-generated stylesheet
    // (scripts/inline-theme-defaults.ts); this must exist before test
    // collection resolves that import. Running this package's own vitest
    // (this config) or the workspace root's (vitest.config.ts, what CI's
    // root test/test:ci scripts use) both need it, so both configs set it.
    globalSetup: ['./scripts/vitest-global-setup.ts'],
  },
});
