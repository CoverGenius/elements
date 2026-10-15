import { describe, expect, it, afterEach } from 'vitest';
import { resolveContext } from '../shared/context';
import {
  clearContexts,
  DEFAULT_TAG_NAME,
  defaultKey,
  getContext,
  hasContext,
  isRegistered,
  setContext,
} from '../core/registry';

// The contexts map is shared across every spec in this file, so each test
// clears it afterwards rather than assume a pristine start.
describe('registry', () => {
  afterEach(() => {
    clearContexts();
  });

  it('defaultKey is the element tag name', () => {
    expect(defaultKey()).toBe(DEFAULT_TAG_NAME);
    expect(DEFAULT_TAG_NAME).toBe('cg-elements');
  });

  it('isRegistered is false until a context is set for the element tag', () => {
    expect(isRegistered()).toBe(false);

    setContext(DEFAULT_TAG_NAME, resolveContext({ environment: 'sandbox' }));

    expect(isRegistered()).toBe(true);
  });

  it('hasContext is false for a tag with no context set', () => {
    expect(hasContext('cg-elements-never-registered')).toBe(false);
  });

  it('hasContext is true after setContext', () => {
    const context = resolveContext({ environment: 'sandbox' });
    setContext('cg-elements-registry-test', context);

    expect(hasContext('cg-elements-registry-test')).toBe(true);
  });

  it('getContext round-trips the exact same context object', () => {
    const context = resolveContext({ environment: 'sandbox' });
    setContext('cg-elements-registry-roundtrip', context);

    expect(getContext('cg-elements-registry-roundtrip')).toBe(context);
  });

  it('getContext returns undefined for an unknown tag name', () => {
    expect(getContext('cg-elements-unknown-tag')).toBeUndefined();
  });
});
