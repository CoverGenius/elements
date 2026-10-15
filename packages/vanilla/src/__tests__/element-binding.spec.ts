import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { Element } from '../core/element';
import { ensureContainer } from '../core/container';
import { clearContainers, clearContexts, getContainer, DEFAULT_TAG_NAME, setContext } from '../core/registry';
import { registerBuilder, clearBuilders } from '../resolver/registry';
import { createMockBuilder } from '../resolver/builders/mock';
import { resolveContext } from '../shared/context';
import { SECTION_ORDER } from '../resolver/layout';
import type { OfferResponse } from '../shared/types';

// Binding tests for the custom element's connectedCallback / disconnectedCallback:
// on upgrade the element binds to its container and reflects current state; on
// disconnect it releases so a remount rebinds. A dedicated tag is defined here
// because customElements.define binds a class to a tag once per process.

const TAG_NAME = 'cg-elements-binding-el';

if (!customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, Element);
}

// The element keys its container on data-presentation-ref, falling back to the
// registered tag name. These tests always set an explicit ref so each gets its
// own container and does not depend on the process-wide registered tag name.
function mount(ref: string): Element {
  const el = document.createElement(TAG_NAME) as Element;
  el.setAttribute('data-presentation-ref', ref);
  document.body.appendChild(el);
  return el;
}

function fragment(text = 'panel'): DocumentFragment {
  const frag = document.createDocumentFragment();
  const node = document.createElement('section');
  node.className = 'built';
  node.textContent = text;
  frag.append(node);
  return frag;
}

describe('Element binding to its container', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    clearContainers();
  });

  it('reflects state set before mount when the element upgrades', () => {
    ensureContainer('binding-lazy').setState({ status: 'rendered', dom: fragment() });

    const el = mount('binding-lazy');

    expect(el.getAttribute('data-cg-elements-state')).toBe('rendered');
  });

  it('starts in loading, then reflects a later render onto the bound element', () => {
    const el = mount('binding-live');
    expect(el.getAttribute('data-cg-elements-state')).toBe('loading');

    ensureContainer('binding-live').setState({ status: 'rendered', dom: fragment() });

    expect(el.getAttribute('data-cg-elements-state')).toBe('rendered');
  });

  it('reflects an error state as a hidden element', () => {
    const el = mount('binding-error');

    ensureContainer('binding-error').setState({ status: 'error' });

    expect(el.getAttribute('data-cg-elements-state')).toBe('hidden');
  });

  it('applies a required flag set before mount when the element upgrades', () => {
    ensureContainer('binding-required').setRequired();

    const el = mount('binding-required');

    expect(el.hasAttribute('data-cg-elements-required')).toBe(true);
  });

  it('does not apply a required flag requested while an option was selected', () => {
    const container = ensureContainer('binding-required-selected');
    container.setSelection('plan-a');
    container.setRequired();

    const el = mount('binding-required-selected');

    expect(el.hasAttribute('data-cg-elements-required')).toBe(false);
  });

  it('routes a container event to a handler set through the client', () => {
    const container = ensureContainer('binding-events');
    let received: unknown;
    container.getClient().on('change', (detail) => {
      received = detail;
    });
    mount('binding-events');

    const detail = { selectedOption: 'a', selectedProductIDs: ['1'] };
    container.emit('change', detail);

    expect(received).toEqual(detail);
  });

  it('a handler bound once survives a remount of the element', () => {
    const container = ensureContainer('binding-remount');
    let count = 0;
    container.getClient().on('change', () => {
      count += 1;
    });

    const first = mount('binding-remount');
    first.remove(); // disconnectedCallback releases the element
    mount('binding-remount'); // fresh element for the same placement

    container.emit('change', { selectedOption: 'a', selectedProductIDs: [] });

    expect(count).toBe(1);
  });

  it('reflects current state onto a remounted element', () => {
    const container = ensureContainer('binding-remount-state');
    const first = mount('binding-remount-state');
    container.setState({ status: 'rendered', dom: fragment() });
    first.remove();

    const second = mount('binding-remount-state');

    expect(second.getAttribute('data-cg-elements-state')).toBe('rendered');
  });

  it('client.unmount() blanks a still-mounted element and frees the container', () => {
    const el = mount('binding-unmount');
    const container = ensureContainer('binding-unmount');
    container.setState({ status: 'rendered', dom: fragment() });

    container.getClient().unmount();

    expect(el.getAttribute('data-cg-elements-state')).toBe('hidden');
    expect(el.shadowRoot?.querySelector('.built')).toBeNull();
    expect(getContainer('binding-unmount')).toBeUndefined();
  });

  it('disconnecting after unmount does not resurrect a container', () => {
    const el = mount('binding-unmount-disconnect');
    ensureContainer('binding-unmount-disconnect').getClient().unmount();

    el.remove();

    expect(getContainer('binding-unmount-disconnect')).toBeUndefined();
  });

  it('re-adding the node after unmount binds a fresh container', () => {
    const el = mount('binding-unmount-remount');
    const stale = ensureContainer('binding-unmount-remount');
    stale.getClient().unmount();

    el.remove();
    document.body.appendChild(el);

    const fresh = getContainer('binding-unmount-remount');

    expect(fresh).toBeDefined();
    expect(fresh).not.toBe(stale);
    expect(el.getAttribute('data-cg-elements-state')).toBe('loading');
  });

  it('a stale client unmount() does not delete the fresh container for the ref', () => {
    const stale = ensureContainer('binding-stale-unmount').getClient();
    stale.unmount();

    const fresh = ensureContainer('binding-stale-unmount');

    stale.unmount();

    expect(getContainer('binding-stale-unmount')).toBe(fresh);
  });
});

// End-to-end attach path: client.render() -> setResponse -> resolvePresentation
// -> reflect -> setPanel -> shadow root. Needs a real seeded context + builders.
describe('attach path: render() into the open shadow root', () => {
  const validOffer = (): OfferResponse =>
    ({
      id: 'o1',
      offer_config_id: 'oc1',
      offer_schema: 'schema-1',
      currency: 'USD',
      products: [],
      content: {},
      presentation: {
        schema_version: '1.0',
        ref: 'r1',
        variant: 'v1',
        theme: {},
        layout: { header: { type: 'default' }, input_body: { type: 'card' } },
      },
    }) as unknown as OfferResponse;

  beforeEach(() => {
    document.body.innerHTML = '';
    setContext(DEFAULT_TAG_NAME, resolveContext({ environment: 'sandbox', debug: true }));
    for (const section of SECTION_ORDER) {
      registerBuilder(section, 'default', createMockBuilder(section));
    }
  });

  afterEach(() => {
    clearContainers();
    clearBuilders();
    clearContexts();
  });

  it('renders resolved panel DOM into the element shadow root', () => {
    const el = mount('attach-render');

    ensureContainer('attach-render').getClient().render(validOffer());

    expect(el.getAttribute('data-cg-elements-state')).toBe('rendered');
    expect(el.shadowRoot?.querySelector('[data-cg-node="header"]')).not.toBeNull();
    expect(el.shadowRoot?.querySelector('[data-cg-node="input_body"]')).not.toBeNull();
  });

  it('holds DOM built before mount and reflects it on upgrade (lazy binding)', () => {
    ensureContainer('attach-lazy').getClient().render(validOffer());

    const el = mount('attach-lazy');

    expect(el.getAttribute('data-cg-elements-state')).toBe('rendered');
    expect(el.shadowRoot?.querySelector('[data-cg-node="header"]')).not.toBeNull();
  });

  it('re-reflects the built panel on a remount', () => {
    ensureContainer('attach-remount').getClient().render(validOffer());
    const first = mount('attach-remount');
    expect(first.shadowRoot?.querySelector('[data-cg-node="header"]')).not.toBeNull();
    first.remove();

    const second = mount('attach-remount');

    expect(second.shadowRoot?.querySelector('[data-cg-node="header"]')).not.toBeNull();
  });

  it('an unresolvable presentation hides the panel and emits error', () => {
    const el = mount('attach-error');
    let error: unknown;
    const container = ensureContainer('attach-error');
    container.getClient().on('error', (detail) => {
      error = detail;
    });

    container.getClient().render({ ...validOffer(), presentation: {} });

    expect(el.getAttribute('data-cg-elements-state')).toBe('hidden');
    expect(el.shadowRoot?.querySelector('[data-cg-node]')).toBeNull();
    expect(error).toMatchObject({ code: 'presentation_empty' });
  });

  it('a second render fully rebuilds the panel with no stale nodes', () => {
    const el = mount('attach-rerender');
    const client = ensureContainer('attach-rerender').getClient();

    client.render(validOffer());
    client.render({
      ...validOffer(),
      presentation: {
        schema_version: '1.0',
        ref: 'r1',
        variant: 'v1',
        theme: {},
        layout: { header: { type: 'default' } },
      },
    } as unknown as OfferResponse);

    expect(el.shadowRoot?.querySelector('[data-cg-node="header"]')).not.toBeNull();
    expect(el.shadowRoot?.querySelector('[data-cg-node="input_body"]')).toBeNull();
  });

  it('renders into the shadow root, not the light DOM (partner CSS cannot reach it)', () => {
    const el = mount('attach-isolation');

    ensureContainer('attach-isolation').getClient().render(validOffer());

    expect(el.querySelector('[data-cg-node="header"]')).toBeNull();
    expect(el.shadowRoot?.querySelector('[data-cg-node="header"]')).not.toBeNull();
  });
});

// The delegated listener wired end to end: a click in the shadow root travels
// listener -> container -> client on() handler, and a programmatic set() reflects
// to the DOM without emitting change. The mock input_body builder stamps the
// option hooks from the offer's products.
describe('interaction: click path through the shadow root', () => {
  const offerWithProducts = (): OfferResponse =>
    ({
      id: 'o1',
      offer_config_id: 'oc1',
      offer_schema: 'schema-1',
      currency: 'USD',
      products: [{ id: 'q1' }, { id: 'q2' }],
      content: {},
      presentation: {
        schema_version: '1.0',
        ref: 'r1',
        variant: 'v1',
        theme: {},
        layout: { input_body: { type: 'card' } },
      },
    }) as unknown as OfferResponse;

  beforeEach(() => {
    document.body.innerHTML = '';
    setContext(DEFAULT_TAG_NAME, resolveContext({ environment: 'sandbox', debug: true }));
    for (const section of SECTION_ORDER) {
      registerBuilder(section, 'default', createMockBuilder(section));
    }
  });

  afterEach(() => {
    clearContainers();
    clearBuilders();
    clearContexts();
  });

  function selectFirstOption(el: Element): void {
    el.shadowRoot
      ?.querySelector('[data-cg-role="selection-control"]')
      ?.dispatchEvent(new Event('change', { bubbles: true }));
  }

  it('emits change with the option quote ids on a user selection', () => {
    const el = mount('int-change');
    const change = vi.fn();
    const container = ensureContainer('int-change');
    container.getClient().on('change', change);

    container.getClient().render(offerWithProducts());
    selectFirstOption(el);

    expect(change).toHaveBeenCalledWith({ selectedOption: 'opt_in_1', selectedProductIDs: ['q1'] });
  });

  it('a programmatic selection.set reflects to the DOM but emits no change', () => {
    const el = mount('int-set');
    const change = vi.fn();
    const container = ensureContainer('int-set');
    const client = container.getClient();
    client.on('change', change);
    client.render(offerWithProducts());

    client.selection.set('opt_in_2');

    const options = el.shadowRoot?.querySelectorAll('[data-cg-role="option"]');
    const selected = el.shadowRoot?.querySelector('[data-cg-selected]');
    expect(selected?.getAttribute('data-cg-product-ids')).toBe('q2');
    expect(options?.[1].querySelector('input')?.checked).toBe(true);
    expect(options?.[0].querySelector('input')?.checked).toBe(false);
    expect(change).not.toHaveBeenCalled();
  });

  it('a programmatic selection.set to the decline option paints the decline', () => {
    const el = mount('int-set-decline');
    const container = ensureContainer('int-set-decline');
    const client = container.getClient();
    const offerWithOptOut = {
      id: 'o1',
      offer_config_id: 'oc1',
      offer_schema: 'schema-1',
      currency: 'USD',
      products: [{ id: 'q1' }, { id: 'q2' }],
      content: {},
      presentation: {
        schema_version: '1.0',
        ref: 'r1',
        variant: 'v1',
        theme: {},
        layout: { input_body: { type: 'card', opt_out: { type: 'default' } } },
      },
    } as unknown as OfferResponse;
    client.render(offerWithOptOut);

    client.selection.set('opt_out');

    const decline = el.shadowRoot?.querySelector('[data-cg-role="decline"]');
    expect(decline?.hasAttribute('data-cg-selected')).toBe(true);
    expect(decline?.querySelector('input')?.checked).toBe(true);
    expect(client.selection.get()).toBe('opt_out');
  });

  it('after unmount + remount, interactions route to the fresh container', () => {
    const el = mount('int-unmount-remount');
    const stale = ensureContainer('int-unmount-remount').getClient();
    stale.render(offerWithProducts());
    stale.unmount();

    el.remove();
    document.body.appendChild(el);

    const fresh = getContainer('int-unmount-remount');
    const change = vi.fn();
    fresh?.getClient().on('change', change);
    fresh?.getClient().render(offerWithProducts());
    selectFirstOption(el);

    expect(change).toHaveBeenCalledWith({ selectedOption: 'opt_in_1', selectedProductIDs: ['q1'] });
    expect(fresh?.getClient().selection.get()).toBe('opt_in_1');
  });

  it('a handler bound once still fires after a second render (listener on the stable root)', () => {
    const el = mount('int-rerender');
    const change = vi.fn();
    const client = ensureContainer('int-rerender').getClient();
    client.on('change', change);

    client.render(offerWithProducts());
    client.render(offerWithProducts());
    selectFirstOption(el);

    expect(change).toHaveBeenCalledTimes(1);
    expect(change).toHaveBeenCalledWith({ selectedOption: 'opt_in_1', selectedProductIDs: ['q1'] });
  });

  it('a CTA click emits change, selects the option, and clears a prior decline', () => {
    const el = mount('int-cta');
    const change = vi.fn();
    const client = ensureContainer('int-cta').getClient();
    client.on('change', change);

    client.render({
      ...offerWithProducts(),
      products: [{ id: 'q1' }],
      presentation: {
        schema_version: '1.0',
        ref: 'r1',
        variant: 'v1',
        theme: {},
        layout: {
          input_body: {
            type: 'card',
            selection: { type: 'cta' },
            opt_out: { type: 'default' },
          },
        },
      },
    } as unknown as OfferResponse);

    const decline = () => el.shadowRoot?.querySelector('[data-cg-role="decline"]');
    const option = () => el.shadowRoot?.querySelector('[data-cg-role="option"]');

    decline()
      ?.querySelector('button')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(change).toHaveBeenLastCalledWith({
      selectedOption: 'opt_out',
      selectedProductIDs: [],
      declined: true,
    });
    expect(decline()?.hasAttribute('data-cg-selected')).toBe(true);

    el.shadowRoot
      ?.querySelector('button[data-cg-role="submit"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(change).toHaveBeenLastCalledWith({ selectedOption: 'opt_in_1', selectedProductIDs: ['q1'] });
    expect(option()?.hasAttribute('data-cg-selected')).toBe(true);
    expect(decline()?.hasAttribute('data-cg-selected')).toBe(false);
    expect(client.selection.get()).toBe('opt_in_1');
  });
});
