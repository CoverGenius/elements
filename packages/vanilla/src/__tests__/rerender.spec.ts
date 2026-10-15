import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { Element } from '../core/element';
import { ensureContainer } from '../core/container';
import { clearContainers, clearContexts, DEFAULT_TAG_NAME, setContext } from '../core/registry';
import { registerBuilder, clearBuilders } from '../resolver/registry';
import { createMockBuilder } from '../resolver/builders/mock';
import { resolveContext } from '../shared/context';
import { SECTION_ORDER } from '../resolver/layout';
import type { OfferResponse } from '../shared/types';

// Re-render is a full teardown + rebuild. These tests drive the whole attach
// path (client.render -> setResponse -> resolvePresentation -> reflect -> setPanel
// -> shadow root) twice, and assert three emergent correctness properties: no stale DOM, a partner
// handler bound before the first render still fires after the second (the delegated listener lives on the stable panel
// root; on() handlers live on the container), and selection is retained or cleared
// by whether its quote id is still offered.

const TAG_NAME = 'cg-elements-rerender-el';

if (!customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, Element);
}

function mount(ref: string): Element {
  const el = document.createElement(TAG_NAME) as Element;
  el.setAttribute('data-presentation-ref', ref);
  document.body.appendChild(el);
  return el;
}

// Two loadable fixtures, synthetic data only. `ids` sets the offered products; the
// layout is stable across both so a difference in DOM is attributable to products.
function offer(ids: string[]): OfferResponse {
  return {
    id: 'o1',
    offer_config_id: 'oc1',
    offer_schema: 'schema-1',
    currency: 'USD',
    products: ids.map((id) => ({ id })),
    content: {},
    presentation: {
      schema_version: '1.0',
      ref: 'r1',
      variant: 'v1',
      theme: {},
      layout: { header: { type: 'default' }, input_body: { type: 'card' } },
    },
  } as unknown as OfferResponse;
}

function optionControls(el: Element): HTMLInputElement[] {
  return Array.from(el.shadowRoot?.querySelectorAll<HTMLInputElement>('[data-cg-role="option"] input') ?? []);
}

function selectOption(el: Element, index: number): void {
  optionControls(el)[index]?.dispatchEvent(new Event('change', { bubbles: true }));
}

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

describe('re-render: teardown produces correct DOM with no stale nodes', () => {
  it('two sequential renders with different product sets both render correctly', () => {
    const el = mount('rr-dom');
    const client = ensureContainer('rr-dom').getClient();

    client.render(offer(['q1', 'q2', 'q3']));
    expect(optionControls(el)).toHaveLength(3);

    client.render(offer(['q9']));

    // The second panel is a full rebuild: exactly the new option set, no leftover
    // options from the first response under the stable panel root.
    const ids = Array.from(el.shadowRoot?.querySelectorAll('[data-cg-role="option"]') ?? []).map((o) =>
      o.getAttribute('data-cg-product-ids'),
    );
    expect(ids).toEqual(['q9']);
  });
});

describe('re-render: a handler bound before either render survives', () => {
  it('a change handler bound before the first render still fires after the second', () => {
    const el = mount('rr-listener');
    const change = vi.fn();
    const client = ensureContainer('rr-listener').getClient();
    client.on('change', change);

    client.render(offer(['q1']));
    client.render(offer(['q1', 'q2']));
    selectOption(el, 1);

    expect(change).toHaveBeenCalledTimes(1);
    expect(change).toHaveBeenCalledWith({ selectedOption: 'opt_in_2', selectedProductIDs: ['q2'] });
  });
});

describe('re-render: multiple selection', () => {
  function multiOffer(ids: string[]): OfferResponse {
    const base = offer(ids) as unknown as Record<string, unknown>;

    return {
      ...base,
      product_rules: [{ slug: 'all', product_ids: ids, initial_state: 'show', min_select: 0, max_select: 3 }],
      presentation: {
        ...(base.presentation as object),
        layout: {
          header: { type: 'default' },
          input_body: { type: 'card', rule: 'all', opt_out: { type: 'default' } },
        },
      },
    } as unknown as OfferResponse;
  }

  it('renders checkboxes, allows several checked, and emits the union of quote ids', () => {
    const el = mount('rr-multi');
    const client = ensureContainer('rr-multi').getClient();
    const change = vi.fn();
    client.on('change', change);

    client.render(multiOffer(['q1', 'q2']));
    selectOption(el, 0);
    selectOption(el, 1);

    expect(optionControls(el).map((c) => [c.type, c.checked])).toEqual([
      ['checkbox', true],
      ['checkbox', true],
    ]);
    expect(change).toHaveBeenLastCalledWith({ selectedOption: 'opt_in_2', selectedProductIDs: ['q1', 'q2'] });
  });

  it('retains only the selected options that are still offered', () => {
    const el = mount('rr-multi-retain');
    const client = ensureContainer('rr-multi-retain').getClient();
    client.render(multiOffer(['q1', 'q2']));
    selectOption(el, 0);
    selectOption(el, 1);

    client.render(multiOffer(['q1', 'q3']));

    expect(optionControls(el).map((c) => c.checked)).toEqual([true, false]);
  });

  it('selection.getAll keeps the retained options and drops the ones no longer offered', () => {
    const el = mount('rr-multi-getall');
    const client = ensureContainer('rr-multi-getall').getClient();
    client.render(multiOffer(['q1', 'q2']));
    selectOption(el, 0);
    selectOption(el, 1);
    expect(client.selection.getAll()).toEqual(['opt_in_1', 'opt_in_2']);

    client.render(multiOffer(['q1', 'q3']));

    expect(client.selection.getAll()).toEqual(['opt_in_1']);
  });
});

describe('re-render: selection retention', () => {
  it('retains the selection when its quote id is still offered, and re-checks it on the new DOM', () => {
    const el = mount('rr-retain');
    const client = ensureContainer('rr-retain').getClient();

    client.render(offer(['q1', 'q2']));
    selectOption(el, 0);
    expect(client.selection.get()).toBe('opt_in_1');

    client.render(offer(['q1', 'q3']));

    expect(client.selection.get()).toBe('opt_in_1');
    const selected = el.shadowRoot?.querySelector('[data-cg-selected]');
    expect(selected?.getAttribute('data-cg-product-ids')).toBe('q1');
    expect(optionControls(el)[0].checked).toBe(true);
  });

  it('clears the selection when its quote id is gone from the new response', () => {
    const el = mount('rr-clear');
    const client = ensureContainer('rr-clear').getClient();

    client.render(offer(['q1', 'q2']));
    selectOption(el, 0);
    expect(client.selection.get()).toBe('opt_in_1');

    client.render(offer(['q2', 'q3']));

    expect(client.selection.get()).toBeNull();
    expect(el.shadowRoot?.querySelector('[data-cg-selected]')).toBeNull();
    expect(optionControls(el).some((c) => c.checked)).toBe(false);
  });

  it('retains an aggregated selection only when every grouped quote id is still offered', () => {
    const el = mount('rr-agg-retain');
    const client = ensureContainer('rr-agg-retain').getClient();
    const agg = (ids: string[]): OfferResponse =>
      ({
        id: 'o1',
        offer_config_id: 'oc1',
        offer_schema: 'schema-1',
        currency: 'USD',
        products: ids.map((id) => ({ id, product_config_id: 'c1' })),
        content: {},
        presentation: {
          schema_version: '1.0',
          ref: 'r1',
          theme: {},
          layout: { input_body: { type: 'card', aggregate_products: true } },
        },
      }) as unknown as OfferResponse;

    client.render(agg(['q1', 'q2']));
    selectOption(el, 0);
    expect(client.selection.get()).toBe('opt_in_1');

    // Both grouped ids still offered: retained.
    client.render(agg(['q1', 'q2']));
    expect(client.selection.get()).toBe('opt_in_1');

    // One grouped id gone: the group changed, selection clears (.every).
    client.render(agg(['q1', 'q3']));
    expect(client.selection.get()).toBeNull();
  });

  it('retains a decline selection while the new layout still declares opt_out', () => {
    const el = mount('rr-decline-retain');
    const client = ensureContainer('rr-decline-retain').getClient();
    const withOptOut = (optOut: boolean): OfferResponse =>
      ({
        id: 'o1',
        offer_config_id: 'oc1',
        offer_schema: 'schema-1',
        currency: 'USD',
        products: [{ id: 'q1' }],
        content: {},
        presentation: {
          schema_version: '1.0',
          ref: 'r1',
          theme: {},
          layout: {
            input_body: optOut ? { type: 'card', opt_out: { type: 'default' } } : { type: 'card' },
          },
        },
      }) as unknown as OfferResponse;

    client.render(withOptOut(true));
    const decline = el.shadowRoot?.querySelector('[data-cg-role="decline"]');
    decline?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Re-render still has opt_out: decline retained (no product ids to match).
    client.render(withOptOut(true));
    expect(client.selection.get()).not.toBeNull();

    // Re-render drops opt_out: decline clears.
    client.render(withOptOut(false));
    expect(client.selection.get()).toBeNull();
  });

  it('clears the selection without throwing when a re-render omits products (header-only update)', () => {
    const el = mount('rr-no-products');
    const client = ensureContainer('rr-no-products').getClient();

    client.render(offer(['q1']));
    selectOption(el, 0);
    expect(client.selection.get()).toBe('opt_in_1');

    const headerOnly = {
      id: 'o1',
      offer_config_id: 'oc1',
      offer_schema: 'schema-1',
      currency: 'USD',
      content: {},
      presentation: {
        schema_version: '1.0',
        ref: 'r1',
        variant: 'v1',
        theme: {},
        layout: { header: { type: 'default' } },
      },
    } as unknown as OfferResponse;

    expect(() => client.render(headerOnly)).not.toThrow();
    expect(client.selection.get()).toBeNull();
    expect(el.getAttribute('data-cg-elements-state')).toBe('rendered');
  });

  it('clearing a gone selection on re-render emits no change (change is user-action only)', () => {
    const el = mount('rr-silent');
    const change = vi.fn();
    const client = ensureContainer('rr-silent').getClient();
    client.on('change', change);

    client.render(offer(['q1']));
    selectOption(el, 0);
    change.mockClear();

    client.render(offer(['q2']));

    expect(change).not.toHaveBeenCalled();
  });
});

describe('re-render: integration checkpoint', () => {
  // One scenario exercising rebuild + a live delegated listener + a rule reaction
  // + selection retention together: render A, select, react, render B.
  it('render A, select, react, render B: no leak, listener survives, retention holds', () => {
    const el = mount('rr-trio');
    const change = vi.fn();
    const client = ensureContainer('rr-trio').getClient();
    client.on('change', change);

    client.render(offer(['q1', 'q2']));
    selectOption(el, 0);
    expect(change).toHaveBeenCalledTimes(1);
    expect(client.selection.get()).toBe('opt_in_1');

    // A rule reaction is an in-place toggle on the stable root, not a re-render.
    const panel = el.shadowRoot?.querySelector('.cg-panel') as HTMLElement;
    const trigger = document.createElement('button');
    trigger.dataset.cgRole = 'decline';
    trigger.dataset.cgTargetRule = 'extra';
    trigger.dataset.cgTargetAction = 'hide';
    const target = document.createElement('div');
    target.dataset.cgRule = 'extra';
    panel.append(trigger, target);
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(target.hasAttribute('hidden')).toBe(true);
    // The decline trigger also carries the `decline` role, so besides applying
    // its reaction it emits a decline change (a "no cover" selection). A decline
    // may be both a reaction trigger and a selection (spec: a trigger may carry
    // both a role and a target reaction).
    expect(change).toHaveBeenCalledTimes(2);
    expect(change).toHaveBeenLastCalledWith({ selectedOption: '', selectedProductIDs: [], declined: true });

    client.render(offer(['q1', 'q3']));

    // Rebuild: the reaction-injected nodes are gone (full teardown), only the new
    // option set remains.
    expect(el.shadowRoot?.querySelector('[data-cg-rule="extra"]')).toBeNull();
    const ids = Array.from(el.shadowRoot?.querySelectorAll('[data-cg-role="option"]') ?? []).map((o) =>
      o.getAttribute('data-cg-product-ids'),
    );
    expect(ids).toEqual(['q1', 'q3']);

    // Listener survives: a selection after render B still emits (3rd change: the
    // two before were the initial select and the decline above).
    selectOption(el, 1);
    expect(change).toHaveBeenCalledTimes(3);
    expect(change).toHaveBeenLastCalledWith({ selectedOption: 'opt_in_2', selectedProductIDs: ['q3'] });

    // Retention: q1 was selected, still offered in B, so it stays selected across
    // the rebuild until the new selection above replaced it. Assert retention on a
    // clean rebuild path with no post-render selection.
    const other = mount('rr-trio-retain');
    const c2 = ensureContainer('rr-trio-retain').getClient();
    c2.render(offer(['q1', 'q2']));
    selectOption(other, 0);
    c2.render(offer(['q1', 'q3']));
    expect(c2.selection.get()).toBe('opt_in_1');
    expect(optionControls(other)[0].checked).toBe(true);
  });
});
