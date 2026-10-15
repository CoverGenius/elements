import { describe, expect, it } from 'vitest';
import { Element } from '../core/element';

describe('Element base class in a DOM environment', () => {
  it('extends the real HTMLElement, not the server-side fallback', () => {
    expect(Object.getPrototypeOf(Element)).toBe(HTMLElement);
  });

  it('can be defined and upgraded as a custom element', () => {
    const tag = 'cg-elements-base-check';

    if (!customElements.get(tag)) {
      customElements.define(tag, Element);
    }

    const el = document.createElement(tag);

    expect(el).toBeInstanceOf(HTMLElement);
    expect(el).toBeInstanceOf(Element);
  });
});
