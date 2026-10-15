import { afterEach, describe, expect, it } from 'vitest';
import { getElement, registerElements } from '../index.js';
import { clearContainers, clearContexts, DEFAULT_TAG_NAME, hasContext } from '../core/registry';

// Kept in its own file: it needs <cg-elements> to be defined by something other
// than this module before registerElements() runs, and the custom elements
// registry is per spec file.
describe('registerElements when <cg-elements> is already defined elsewhere', () => {
  afterEach(() => {
    clearContainers();
    clearContexts();
  });

  it('does not throw and records no context', () => {
    // Simulates a second bundle of this SDK on the page: it has its own
    // contexts state, so hasContext() is false here even though the other
    // bundle already called customElements.define() for the tag.
    expect(hasContext(DEFAULT_TAG_NAME)).toBe(false);

    customElements.define(DEFAULT_TAG_NAME, class extends HTMLElement {});

    expect(() => registerElements({ environment: 'sandbox' })).not.toThrow();
    expect(hasContext(DEFAULT_TAG_NAME)).toBe(false);
    expect(getElement()).toBeUndefined();
  });
});
