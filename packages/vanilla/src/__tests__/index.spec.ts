import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { registerElements, getElement } from '../index.js';
import { resolveContext } from '../shared/context';
import { clearContainers, clearContexts, DEFAULT_TAG_NAME, getContext, setContext } from '../core/registry';

describe('registerElements / getElement', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    clearContainers();
  });

  it('returns a client (not the DOM node) with no ref', () => {
    document.body.innerHTML = '<cg-elements></cg-elements>';
    registerElements({ environment: 'sandbox' });

    const client = getElement();

    expect(client).not.toBeInstanceOf(HTMLElement);
    expect(typeof client?.render).toBe('function');
    expect(typeof client?.on).toBe('function');
  });

  it('returns a client for a specific data-presentation-ref', () => {
    document.body.innerHTML = '<cg-elements data-presentation-ref="checkout-primary"></cg-elements>';
    registerElements({ environment: 'sandbox' });

    expect(typeof getElement('checkout-primary')?.render).toBe('function');
  });

  it('does not throw when no matching element is in the DOM (lazy binding)', () => {
    registerElements({ environment: 'sandbox' });

    expect(() => getElement('missing')).not.toThrow();
  });
});

describe('registerElements idempotency', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearContainers();
    clearContexts();
  });

  it('first call wins: a later call does not replace the context', () => {
    // Seeds the "first call" context directly via setContext rather than a real
    // registerElements() call: the element class can only be defined once per
    // registry, and the earlier tests in this file already defined it.
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const first = resolveContext({ environment: 'sandbox', debug: true });

    setContext(DEFAULT_TAG_NAME, first);
    registerElements({ environment: 'production' });

    expect(getContext(DEFAULT_TAG_NAME)).toBe(first);
    expect(debugSpy).toHaveBeenCalledWith('[cg-elements]', expect.stringContaining('ignoring (first call wins'));
  });

  it('a ref is addressed independently of the default placement', () => {
    // getElement() reads SDK state only, so a client for a ref resolves without
    // any element in the DOM and independently of the default (tag-name) key.
    setContext(DEFAULT_TAG_NAME, resolveContext({ environment: 'sandbox' }));

    const byRef = getElement('foo');
    const byDefault = getElement();

    expect(typeof byRef?.render).toBe('function');
    expect(byRef).not.toBe(byDefault);
  });

  it('no longer accepts tagName or nonce in the config', () => {
    // @ts-expect-error tagName is not part of RegisterElementsConfig
    const withTagName = () => registerElements({ environment: 'sandbox', tagName: 'x-elements' });
    // @ts-expect-error nonce is not part of RegisterElementsConfig
    const withNonce = () => registerElements({ environment: 'sandbox', nonce: 'abc' });

    expect(typeof withTagName).toBe('function');
    expect(typeof withNonce).toBe('function');
  });
});
