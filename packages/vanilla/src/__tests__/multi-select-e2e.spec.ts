import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { Element } from '../core/element';
import { ensureContainer } from '../core/container';
import { clearContainers, clearContexts, DEFAULT_TAG_NAME, setContext } from '../core/registry';
import { registerSectionBuilders } from '../resolver/builders';
import { clearBuilders } from '../resolver/registry';
import { resolveContext } from '../shared/context';
import type { OfferResponse } from '../shared/types';

const TAG_NAME = 'cg-elements-multi-e2e';

if (!customElements.get(TAG_NAME)) customElements.define(TAG_NAME, Element);

function mount(ref: string): Element {
  const el = document.createElement(TAG_NAME) as Element;
  el.setAttribute('data-presentation-ref', ref);
  document.body.appendChild(el);
  return el;
}

// The layout deliberately names no `rule`: the offer's single product_rule must apply on its own.
function offer(selectionType: 'default' | 'cta', maxSelect: number): OfferResponse {
  return {
    id: 'o1',
    offer_config_id: 'oc1',
    offer_schema: 'schema-1',
    currency: 'AUD',
    products: [
      { id: 'q1', product_config_id: 'c1' },
      { id: 'q2', product_config_id: 'c1' },
    ],
    content: {
      negative_cta: 'No thanks',
      positive_cta: 'Add',
      products: [
        { id: 'q1', title: 'Ticket A' },
        { id: 'q2', title: 'Ticket B' },
      ],
    },
    product_rules: [
      { slug: 'multi', product_ids: ['q1', 'q2'], initial_state: 'show', min_select: 0, max_select: maxSelect },
    ],
    presentation: {
      schema_version: '1.0',
      ref: 'r1',
      theme: {},
      layout: {
        input_body: {
          type: 'default',
          selection: { type: selectionType },
          opt_in: { type: 'default', heading: { type: 'default' } },
          opt_out: { type: 'default', heading: { type: 'default' } },
        },
      },
    },
  } as unknown as OfferResponse;
}

const q = (el: Element, selector: string) => Array.from(el.shadowRoot?.querySelectorAll<HTMLElement>(selector) ?? []);

const inputs = (el: Element) => q(el, 'input') as HTMLInputElement[];

beforeEach(() => {
  document.body.innerHTML = '';
  setContext(DEFAULT_TAG_NAME, resolveContext({ environment: 'sandbox', debug: true }));
  registerSectionBuilders();
});

afterEach(() => {
  clearContainers();
  clearBuilders();
  clearContexts();
});

describe('multi-select through the real input_body builder', () => {
  it('renders opt_in as checkboxes and the decline as a radio for the default selector', () => {
    const el = mount('e2e-default');
    ensureContainer('e2e-default').getClient().render(offer('default', 2));

    expect(inputs(el).map((i) => i.type)).toEqual(['checkbox', 'checkbox', 'radio']);
  });

  it('keeps radios for an XOR rule (max_select 1)', () => {
    const el = mount('e2e-xor');
    ensureContainer('e2e-xor').getClient().render(offer('default', 1));

    expect(inputs(el).map((i) => i.type)).toEqual(['radio', 'radio', 'radio']);
  });

  it('checks several options, emits the union, and lets a decline replace them', () => {
    const el = mount('e2e-flow');
    const client = ensureContainer('e2e-flow').getClient();
    const events: unknown[] = [];
    client.on('change', (d) => events.push(d));
    client.render(offer('default', 2));

    inputs(el)[0].dispatchEvent(new Event('change', { bubbles: true }));
    inputs(el)[1].dispatchEvent(new Event('change', { bubbles: true }));

    expect(inputs(el).map((i) => i.checked)).toEqual([true, true, false]);
    expect(events.at(-1)).toEqual({ selectedOption: 'opt_in_2', selectedProductIDs: ['q1', 'q2'] });

    inputs(el)[2].dispatchEvent(new Event('change', { bubbles: true }));

    expect(inputs(el).map((i) => i.checked)).toEqual([false, false, true]);
    expect(events.at(-1)).toEqual({ selectedOption: 'opt_out', selectedProductIDs: [], declined: true });
  });

  it('selection.getAll tracks select, deselect and decline through the real DOM', () => {
    const el = mount('e2e-getall');
    const client = ensureContainer('e2e-getall').getClient();
    client.render(offer('default', 2));
    const toggle = (i: number) => inputs(el)[i].dispatchEvent(new Event('change', { bubbles: true }));

    expect(client.selection.getAll()).toEqual([]);

    toggle(0);
    toggle(1);
    expect(client.selection.getAll()).toEqual(['opt_in_1', 'opt_in_2']);
    expect(client.selection.get()).toBe('opt_in_2');

    toggle(0);
    expect(client.selection.getAll()).toEqual(['opt_in_2']);

    toggle(2);
    expect(client.selection.getAll()).toEqual(['opt_out']);
  });

  it('selection.getAll is a 0- or 1-element array for an XOR rule', () => {
    const el = mount('e2e-getall-xor');
    const client = ensureContainer('e2e-getall-xor').getClient();
    client.render(offer('default', 1));
    const pick = (i: number) => inputs(el)[i].dispatchEvent(new Event('change', { bubbles: true }));

    expect(client.selection.getAll()).toEqual([]);

    pick(0);
    pick(1);

    expect(client.selection.getAll()).toEqual(['opt_in_2']);
  });

  it('supports multiple selection with the cta selector: each button toggles its option', () => {
    const el = mount('e2e-cta');
    const client = ensureContainer('e2e-cta').getClient();
    const events: unknown[] = [];
    client.on('change', (d) => events.push(d));
    client.render(offer('cta', 2));

    const buttons = q(el, '[data-cg-role="submit"]');
    buttons[0].click();
    buttons[1].click();

    expect(q(el, '[data-cg-role="option"][data-cg-selected]')).toHaveLength(2);
    expect(events.at(-1)).toEqual({ selectedOption: 'opt_in_2', selectedProductIDs: ['q1', 'q2'] });

    buttons[0].click();

    expect(q(el, '[data-cg-role="option"][data-cg-selected]')).toHaveLength(1);
    expect(events.at(-1)).toEqual({ selectedOption: 'opt_in_1', selectedProductIDs: ['q2'] });
  });
});
