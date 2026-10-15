import { run } from './inline-theme-defaults';

// Vitest calls this once, before test collection (root vitest.config.ts):
// core/element.ts imports the generated stylesheet this produces, and CI's
// root-level test/test:ci scripts invoke vitest directly, bypassing this
// package's own chained dev/build/test scripts.
export async function setup(): Promise<void> {
  await run();
}
