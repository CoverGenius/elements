import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { Element } from '../core/element';
import { ensureContainer } from '../core/container';
import { clearContainers } from '../core/registry';
import { internalThemeDefaults } from '../theme/wire-mapping';

const TAG_NAME = 'cg-elements-test-el';

if (!customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, Element);
}

function panelFragment(text = 'panel'): DocumentFragment {
  const frag = document.createDocumentFragment();
  const node = document.createElement('section');
  node.className = 'built';
  node.textContent = text;
  frag.append(node);
  return frag;
}

describe('Element', () => {
  let el: Element;

  beforeEach(() => {
    document.body.innerHTML = '';
    el = document.createElement(TAG_NAME) as Element;
  });

  afterEach(() => {
    clearContainers();
  });

  it('sets state to "loading" on connectedCallback (the initial paint)', () => {
    document.body.appendChild(el);

    expect(el.getAttribute('data-cg-elements-state')).toBe('loading');
  });

  it('attaches an open shadow root on connect', () => {
    document.body.appendChild(el);

    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot?.mode).toBe('open');
  });

  it('applies a :host baseline that restores block layout after all: initial', () => {
    document.body.appendChild(el);

    const root = el.shadowRoot;
    const adopted = root?.adoptedStyleSheets?.[0];
    const css = adopted?.cssRules?.[0]?.cssText ?? root?.querySelector('style')?.textContent ?? '';

    expect(css).toContain('all: initial');
    expect(css).toContain('display: block');
  });

  it('anchors text sizes with a px font-size base that matches the themable default', () => {
    document.body.appendChild(el);

    const root = el.shadowRoot;
    const adopted = root?.adoptedStyleSheets?.[0];
    const css = adopted?.cssRules?.[0]?.cssText ?? root?.querySelector('style')?.textContent ?? '';

    expect(css).toContain(`--cge-font-size-base: ${internalThemeDefaults.fontSizeBase}`);
    expect(internalThemeDefaults.fontSizeBase).toBe('16px');
  });

  it('mounts built panel DOM into the shadow root on setPanel("rendered")', () => {
    document.body.appendChild(el);

    el.setPanel('rendered', panelFragment('hello'));

    expect(el.getAttribute('data-cg-elements-state')).toBe('rendered');
    expect(el.shadowRoot?.querySelector('.built')?.textContent).toBe('hello');
  });

  it('does not leak the panel DOM into the light DOM', () => {
    document.body.appendChild(el);

    el.setPanel('rendered', panelFragment());

    expect(el.querySelector('.built')).toBeNull();
  });

  it('adopts the fragment into the panel document on insert', () => {
    document.body.appendChild(el);
    const frag = panelFragment();

    el.setPanel('rendered', frag);

    const mounted = el.shadowRoot?.querySelector('.built');
    expect(mounted?.ownerDocument).toBe(el.ownerDocument);
  });

  it('clears the panel on setPanel("loading") and setPanel("hidden")', () => {
    document.body.appendChild(el);
    el.setPanel('rendered', panelFragment());

    el.setPanel('loading');
    expect(el.getAttribute('data-cg-elements-state')).toBe('loading');
    expect(el.shadowRoot?.querySelector('.built')).toBeNull();

    el.setPanel('rendered', panelFragment());
    el.setPanel('hidden');
    expect(el.getAttribute('data-cg-elements-state')).toBe('hidden');
    expect(el.shadowRoot?.querySelector('.built')).toBeNull();
  });

  it('rebuilds fully on a second render: no stale nodes from the first', () => {
    document.body.appendChild(el);

    el.setPanel('rendered', panelFragment('first'));
    el.setPanel('rendered', panelFragment('second'));

    const built = el.shadowRoot?.querySelectorAll('.built');
    expect(built?.length).toBe(1);
    expect(built?.[0].textContent).toBe('second');
  });

  it('re-pushing the same fragment still mounts (clone, not consume)', () => {
    document.body.appendChild(el);
    const frag = panelFragment('reused');

    el.setPanel('rendered', frag);
    el.setPanel('loading');
    el.setPanel('rendered', frag);

    expect(el.shadowRoot?.querySelector('.built')?.textContent).toBe('reused');
  });

  it('toggles the required attribute via applyRequired()', () => {
    document.body.appendChild(el);

    el.applyRequired(true);
    expect(el.hasAttribute('data-cg-elements-required')).toBe(true);

    el.applyRequired(false);
    expect(el.hasAttribute('data-cg-elements-required')).toBe(false);
  });

  it('routes an emitted event to a handler bound through the client', () => {
    el.setAttribute('data-presentation-ref', 'element-emit-test');
    document.body.appendChild(el);

    const callback = vi.fn();
    const detail = { selectedOption: 'x', selectedProductIDs: ['1'] };

    ensureContainer('element-emit-test').getClient().on('change', callback);
    el.emit('change', detail);

    expect(callback).toHaveBeenCalledWith(detail);
  });
});
