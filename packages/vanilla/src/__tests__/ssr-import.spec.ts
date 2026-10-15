// @vitest-environment node
// happy-dom defines the DOM globals, so this file runs under plain Node.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Every test re-imports the whole entry graph after vi.resetModules(). Under the
// shared CI runner with v8 coverage on, that cold import exceeds the 5s default.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

async function loadFresh() {
  vi.resetModules();

  const entry = await import('../index.js');
  const registry = await import('../core/registry');

  return { ...entry, registry };
}

describe('server-side import safety (no DOM globals)', () => {
  beforeEach(() => {
    expect(typeof HTMLElement).toBe('undefined');
    expect(typeof customElements).toBe('undefined');
    expect(typeof document).toBe('undefined');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('imports the public entry without throwing', async () => {
    const entry = await loadFresh();

    expect(typeof entry.registerElements).toBe('function');
    expect(typeof entry.getElement).toBe('function');
  });

  it('imports the element module without throwing', async () => {
    vi.resetModules();

    await expect(import('../core/element')).resolves.toHaveProperty('Element');
  });

  it('registerElements() is a no-op and does not throw', async () => {
    const { registerElements } = await loadFresh();

    expect(() => registerElements({ environment: 'sandbox' })).not.toThrow();
    expect(() => registerElements()).not.toThrow();
  });

  it('registerElements() records no module state, so nothing leaks across server requests', async () => {
    const { registerElements, registry } = await loadFresh();

    registerElements({ environment: 'sandbox' });

    expect(registry.isRegistered()).toBe(false);
    expect(registry.hasContext(registry.DEFAULT_TAG_NAME)).toBe(false);
  });

  it('getElement() returns undefined, with and without a ref', async () => {
    const { registerElements, getElement } = await loadFresh();

    registerElements({ environment: 'sandbox' });

    expect(getElement()).toBeUndefined();
    expect(getElement('checkout-primary')).toBeUndefined();
  });

  it('still no-ops when a shim defines HTMLElement but not customElements', async () => {
    vi.stubGlobal('HTMLElement', class {});

    const { registerElements, getElement, registry } = await loadFresh();

    expect(() => registerElements({ environment: 'sandbox' })).not.toThrow();
    expect(registry.isRegistered()).toBe(false);
    expect(getElement()).toBeUndefined();
  });
});
