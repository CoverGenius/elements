import { describe, expect, it } from 'vitest';
import { resolveContext } from '../shared/context';
import { bindSection } from '../resolver/binding';
import { inputBodyBuilder } from '../resolver/builders/input-body';
import { defaultSelectionBehavior } from '../resolver/selection';
import type { BuildArgs } from '../resolver/builder';
import type { LayoutNode } from '../resolver/layout';
import type { OfferResponse, Product } from '../shared/types';
import { CG_ATTR, CG_ROLE } from '../shared/attributes';

const ctx = () => resolveContext({ environment: 'sandbox' });

function quote(id: string, configId?: string, amount?: number, pdsUrl?: string): Product {
  const details: Record<string, unknown> = {};
  if (amount !== undefined) details.finance = { price: { total_amount: amount } };
  if (pdsUrl !== undefined) details.pds_url = pdsUrl;
  return {
    id,
    ...(configId ? { product_config_id: configId } : {}),
    ...(Object.keys(details).length ? { details: details as Product['details'] } : {}),
  };
}

function offer(overrides: Partial<OfferResponse> = {}): OfferResponse {
  return {
    id: 'o1',
    offer_config_id: 'oc1',
    offer_schema: 'schema-1',
    currency: 'USD',
    products: [],
    content: {},
    presentation: {},
    ...overrides,
  } as OfferResponse;
}

const node = (extra: Record<string, unknown> = {}): LayoutNode => ({ type: 'default', ...extra });

/** Binds input_body content, then runs the adapter with the given products/selection. */
function render(inputBody: LayoutNode, o: OfferResponse, products: Product[]): HTMLElement {
  const content = bindSection('input_body', inputBody, o, ctx(), products);
  const args: BuildArgs = {
    node: inputBody,
    content,
    selection: defaultSelectionBehavior(products.map((p) => p.id)),
    ctx: ctx(),
    doc: document,
    products,
  };
  return inputBodyBuilder(args);
}

describe('bindSection: per-product opt_in binding (non-aggregated)', () => {
  it('resolves distinct content per product when not aggregated', () => {
    const inputBody = node({ opt_in: { type: 'card', heading: { type: 'default' } } });
    const products = [quote('q1'), quote('q2')];
    const o = offer({
      products,
      content: {
        products: [
          { id: 'q1', title: 'Standard' },
          { id: 'q2', title: 'Premium' },
        ],
      },
    });

    const bound = bindSection('input_body', inputBody, o, ctx(), products);

    expect(bound.opt_in?.kind).toBe('bundle_list');
    if (bound.opt_in?.kind === 'bundle_list') {
      expect(bound.opt_in.groups).toHaveLength(2);
      expect(bound.opt_in.groups[0].entries.heading).toEqual({ kind: 'text', value: 'Standard' });
      expect(bound.opt_in.groups[1].entries.heading).toEqual({ kind: 'text', value: 'Premium' });
      expect(bound.opt_in.groups[0].productIds).toEqual(['q1']);
      expect(bound.opt_in.groups[1].productIds).toEqual(['q2']);
    }
  });

  it('collapses to one group per config id when aggregated, summing the premium', () => {
    const inputBody = node({ aggregate_products: true, opt_in: { type: 'card', price: { type: 'default' } } });
    const products = [quote('q1', 'c1', 10), quote('q2', 'c1', 15)];
    const o = offer({ products, content: { price_unit: 'total', products: [{ id: 'q1' }] } });

    const bound = bindSection('input_body', inputBody, o, ctx(), products);

    expect(bound.opt_in?.kind).toBe('bundle_list');
    if (bound.opt_in?.kind === 'bundle_list') {
      expect(bound.opt_in.groups).toHaveLength(1);
      expect(bound.opt_in.groups[0].productIds).toEqual(['q1', 'q2']);
      expect(bound.opt_in.groups[0].entries.price).toEqual({ kind: 'price', formatted: '$25.00', label: 'total' });
    }
  });
});

describe('inputBodyBuilder adapter', () => {
  it('renders one option per non-aggregated product with its own heading', () => {
    const inputBody = node({ opt_in: { type: 'default', heading: { type: 'default' } } });
    const products = [quote('q1'), quote('q2')];
    const o = offer({
      products,
      content: {
        products: [
          { id: 'q1', title: 'Standard' },
          { id: 'q2', title: 'Premium' },
        ],
      },
    });

    const el = render(inputBody, o, products);
    const options = el.querySelectorAll(`[${CG_ATTR.role}="${CG_ROLE.option}"]`);

    expect(options).toHaveLength(2);
    expect(options[0].textContent).toContain('Standard');
    expect(options[1].textContent).toContain('Premium');
    expect(options[0].getAttribute(CG_ATTR.productIds)).toBe('q1');
    expect(options[1].getAttribute(CG_ATTR.productIds)).toBe('q2');
    expect(options[0].getAttribute(CG_ATTR.optionId)).toBe('opt_in_1');
    expect(options[1].getAttribute(CG_ATTR.optionId)).toBe('opt_in_2');
  });

  it('renders the default opt-in price inline with the heading for radio options', () => {
    const inputBody = node({
      opt_in: { type: 'default', heading: { type: 'default' }, price: { type: 'default' } },
    });
    const products = [quote('q1', undefined, 12.5)];
    const o = offer({
      products,
      content: { price_unit: 'per trip', products: [{ id: 'q1', title: 'Standard' }] },
    });

    const el = render(inputBody, o, products);
    const option = el.querySelector(`[${CG_ATTR.role}="${CG_ROLE.option}"]`) as HTMLElement;
    const header = option.querySelector('.cge-input-option-header');
    const price = option.querySelector('.cge-price');

    expect(price).not.toBeNull();
    expect(price?.classList.contains('cge-price-default')).toBe(true);
    expect(price?.classList.contains('cge-price-inline-end')).toBe(true);
    expect(price?.querySelector('.cge-price-amount')?.textContent).toBe('$12.50');
    expect(price?.querySelector('.cge-price-label')?.textContent).toBe('per trip');
    expect(header?.contains(price)).toBe(true);
  });

  it('renders a block price below the heading for card options', () => {
    const inputBody = node({
      opt_in: { type: 'card', heading: { type: 'default' }, price: { type: 'block', location: 'below' } },
    });
    const products = [quote('q1', undefined, 12.5)];
    const o = offer({
      products,
      content: { price_unit: 'per trip', products: [{ id: 'q1', title: 'Standard' }] },
    });

    const el = render(inputBody, o, products);
    const option = el.querySelector(`[${CG_ATTR.role}="${CG_ROLE.option}"]`) as HTMLElement;
    const content = option.querySelector('.cge-input-option-content') as HTMLElement;
    const header = content.querySelector('.cge-input-option-header');
    const price = content.querySelector('.cge-price');
    const body = content.querySelector('.cge-input-option-collapse');

    expect(price?.classList.contains('cge-price-block')).toBe(true);
    expect(price?.classList.contains('cge-price-below')).toBe(true);
    expect(price?.previousElementSibling).toBe(header);
    expect(price?.nextElementSibling).toBe(body);
  });

  it('renders every bound opt-in link', () => {
    const inputBody = node({
      opt_in: { type: 'default', links: { type: 'default' } },
    });
    const products = [quote('q1', undefined, undefined, 'https://cg.example/pds.pdf')];
    const o = offer({
      products,
      content: {
        extras: { ipid_url: 'https://cg.example/ipid.pdf', ipid_label: 'IPID' },
        products: [{ id: 'q1', terms_cta: 'Product terms' }],
      },
    });

    const el = render(inputBody, o, products);
    const links = el.querySelectorAll('.cge-option-links a');

    expect(Array.from(links, (link) => [link.getAttribute('href'), link.textContent])).toEqual([
      ['https://cg.example/pds.pdf', 'Product terms'],
      ['https://cg.example/ipid.pdf', 'IPID'],
    ]);
    expect(el.querySelector('.cge-option-links-separator')?.textContent).toBe('|');
  });

  it('binds opt-in info panel content and location', () => {
    const inputBody = node({
      opt_in: {
        type: 'default',
        heading: { type: 'default' },
        info_panel: { type: 'default', location: 'top' },
      },
    });
    const products = [quote('q1')];
    const o = offer({
      products,
      content: {
        extras: { opt_in_info_panel_message: 'Important coverage note' },
        products: [{ id: 'q1', title: 'Standard' }],
      },
    });

    const el = render(inputBody, o, products);
    const option = el.querySelector(`[${CG_ATTR.role}="${CG_ROLE.option}"]`) as HTMLElement;
    const body = option.querySelector('.cge-input-option-body');

    expect(body?.firstElementChild?.classList.contains('cge-message-info')).toBe(true);
    expect(body?.textContent).toContain('Important coverage note');
  });

  it('renders a decline option when opt_out is present', () => {
    const inputBody = node({
      opt_in: { type: 'default', heading: { type: 'default' } },
      opt_out: { type: 'default', heading: { type: 'default' } },
    });
    const products = [quote('q1')];
    const o = offer({
      products,
      content: { negative_cta: 'No thanks', products: [{ id: 'q1', title: 'Standard' }] },
    });

    const el = render(inputBody, o, products);
    const decline = el.querySelector(`[${CG_ATTR.role}="${CG_ROLE.decline}"]`) as HTMLElement;

    expect(decline).not.toBeNull();
    expect(decline.textContent).toContain('No thanks');
    expect(decline.getAttribute(CG_ATTR.productIds)).toBe('');
    expect(decline.getAttribute(CG_ATTR.optionId)).toBe('opt_out');
  });

  it('keeps every opt-in option expanded and still collapses the opt-out option', () => {
    const inputBody = node({
      opt_in: { type: 'default', heading: { type: 'default' } },
      opt_out: { type: 'default', heading: { type: 'default' } },
    });
    const products = [quote('q1'), quote('q2')];
    const o = offer({
      products,
      content: {
        negative_cta: 'No thanks',
        products: [
          { id: 'q1', title: 'A' },
          { id: 'q2', title: 'B' },
        ],
      },
    });

    const el = render(inputBody, o, products);
    const optIns = el.querySelectorAll(`[${CG_ATTR.role}="${CG_ROLE.option}"]`);

    expect(optIns).toHaveLength(2);
    for (const optIn of optIns) {
      expect(optIn.classList.contains('cge-input-option-collapsed')).toBe(false);
    }

    const decline = el.querySelector(`[${CG_ATTR.role}="${CG_ROLE.decline}"]`);
    expect(decline?.classList.contains('cge-input-option-collapsed')).toBe(true);
  });

  describe('selection.location drives the radio/checkbox edge', () => {
    const CONTROL = 'cge-input-option-control';
    const CONTENT = 'cge-input-option-content';

    /** Control/content DOM order of one option, ignoring badges and the above row. */
    const layoutOrder = (option: Element): string[] =>
      Array.from(option.children)
        .filter((c) => c.classList.contains(CONTROL) || c.classList.contains(CONTENT))
        .map((c) => (c.classList.contains(CONTROL) ? 'control' : 'content'));

    const renderRow = (layoutNode: Record<string, unknown>, optIn: Record<string, unknown> = {}, extra = {}) => {
      const inputBody = node({
        opt_in: { type: 'default', heading: { type: 'default' }, ...optIn },
        ...layoutNode,
      });
      const products = [quote('q1', undefined, 12.5)];
      const o = offer({
        products,
        content: {
          price_unit: 'per trip',
          products: [{ id: 'q1', title: 'Standard', credibility_badge: 'Popular' }],
          ...extra,
        },
      });
      const el = render(inputBody, o, products);

      return el.querySelector(`[${CG_ATTR.role}="${CG_ROLE.option}"]`) as HTMLElement;
    };

    it('puts the control at the end edge for inline_end', () => {
      // Arrange + Act
      const option = renderRow({ selection: { type: 'default', location: 'inline_end' } });

      // Assert
      expect(layoutOrder(option)).toEqual(['content', 'control']);
    });

    it('puts the control at the start edge for inline_start', () => {
      const option = renderRow({ selection: { type: 'default', location: 'inline_start' } });

      expect(layoutOrder(option)).toEqual(['control', 'content']);
    });

    it('defaults to inline_start when location is absent or selection is omitted', () => {
      for (const layoutNode of [{ selection: { type: 'default' } }, {}]) {
        const option = renderRow(layoutNode);

        expect(layoutOrder(option)).toEqual(['control', 'content']);
      }
    });

    it('falls back to inline_start for a location radio/checkbox does not support, without throwing', () => {
      for (const location of ['bottom', 'nonsense']) {
        const option = renderRow({ selection: { type: 'default', location } });

        expect(layoutOrder(option), `location=${location}`).toEqual(['control', 'content']);
      }
    });

    it('ignores align for the control edge', () => {
      for (const align of ['start', 'center', 'end']) {
        const start = renderRow({ align, selection: { type: 'default', location: 'inline_start' } });
        const end = renderRow({ align, selection: { type: 'default', location: 'inline_end' } });

        expect(layoutOrder(start), `align=${align} inline_start`).toEqual(['control', 'content']);
        expect(layoutOrder(end), `align=${align} inline_end`).toEqual(['content', 'control']);
      }
    });

    it('no longer reads align:end as the end edge when selection.location is absent', () => {
      const option = renderRow({ align: 'end' });

      expect(layoutOrder(option)).toEqual(['control', 'content']);
    });

    it('keeps align:center as text alignment only for cta rows', () => {
      const option = renderRow(
        { align: 'center', selection: { type: 'cta', location: 'inline_end' } },
        {},
        { positive_cta: 'Add' },
      );

      expect(option.querySelector('.cge-input-option-header-center')).not.toBeNull();
      expect(option.querySelector(`.${CONTROL}`)).toBeNull();
    });

    it('keeps the control outermost with inline_end badge and price present', () => {
      const optIn = {
        badge: { type: 'default', location: 'inline_end' },
        price: { type: 'default', location: 'inline_end' },
      };
      const end = renderRow({ selection: { type: 'default', location: 'inline_end' } }, optIn);
      const start = renderRow({ selection: { type: 'default', location: 'inline_start' } }, optIn);

      expect(end.querySelector(`:scope > .${CONTROL}`)).not.toBeNull();
      expect(end.querySelector(`.${CONTENT} .cge-input-option-header-trailing`)).not.toBeNull();
      expect(layoutOrder(end)).toEqual(['content', 'control']);
      expect(start.querySelector(`:scope > .${CONTROL}`)).not.toBeNull();
      expect(start.querySelector(`.${CONTENT} .cge-input-option-header-trailing`)).not.toBeNull();
      expect(layoutOrder(start)).toEqual(['control', 'content']);
    });

    it('keeps the control outermost with an inline_start badge in the header', () => {
      const optIn = { badge: { type: 'default', location: 'inline_start' } };
      const end = renderRow({ selection: { type: 'default', location: 'inline_end' } }, optIn);
      const start = renderRow({ selection: { type: 'default', location: 'inline_start' } }, optIn);

      expect(layoutOrder(end)).toEqual(['content', 'control']);
      expect(layoutOrder(start)).toEqual(['control', 'content']);
    });

    it('keeps the control outermost with a resting badge on a card', () => {
      const optIn = { type: 'card', badge: { type: 'default', location: 'resting_start' } };
      const end = renderRow({ selection: { type: 'default', location: 'inline_end' } }, optIn);
      const start = renderRow({ selection: { type: 'default', location: 'inline_start' } }, optIn);

      expect(layoutOrder(end)).toEqual(['content', 'control']);
      expect(layoutOrder(start)).toEqual(['control', 'content']);
    });

    it('pins the above badge DOM at inline_end: the control joins the badge row, content follows', () => {
      const option = renderRow(
        { selection: { type: 'default', location: 'inline_end' } },
        { badge: { type: 'default', location: 'above' } },
      );
      const above = option.querySelector(':scope > .cge-input-option-above') as HTMLElement;

      expect(above.children).toHaveLength(2);
      expect(above.children[0].classList.contains('cge-badge')).toBe(true);
      expect(above.children[1].classList.contains(CONTROL)).toBe(true);
      expect(option.lastElementChild?.classList.contains(CONTENT)).toBe(true);
    });

    it('pins the above badge DOM at inline_start: the badge row holds only the pill, control precedes content', () => {
      const option = renderRow(
        { selection: { type: 'default', location: 'inline_start' } },
        { badge: { type: 'default', location: 'above' } },
      );
      const above = option.querySelector(':scope > .cge-input-option-above') as HTMLElement;

      expect(above.children).toHaveLength(1);
      expect(above.children[0].classList.contains('cge-badge')).toBe(true);
      expect(layoutOrder(option)).toEqual(['control', 'content']);
    });

    it('applies the edge to checkboxes and to the decline radio', () => {
      const multiple = {
        ...defaultSelectionBehavior(['q1', 'q2']),
        control: 'checkbox' as const,
        multiple: true,
        maxSelect: 2,
      };
      const inputBody = node({
        selection: { type: 'default', location: 'inline_end' },
        opt_in: { type: 'default', heading: { type: 'default' } },
        opt_out: { type: 'default', heading: { type: 'default' } },
      });
      const products = [quote('q1'), quote('q2')];
      const o = offer({
        products,
        content: {
          negative_cta: 'No',
          products: [
            { id: 'q1', title: 'A' },
            { id: 'q2', title: 'B' },
          ],
        },
      });
      const content = bindSection('input_body', inputBody, o, ctx(), products);

      const el = inputBodyBuilder({
        node: inputBody,
        content,
        selection: multiple,
        ctx: ctx(),
        doc: document,
        products,
      });
      const panels = Array.from(el.querySelectorAll('.cge-input-option'));

      expect(Array.from(el.querySelectorAll('input')).map((i) => i.type)).toEqual(['checkbox', 'checkbox', 'radio']);
      expect(panels).toHaveLength(3);
      for (const panel of panels) expect(layoutOrder(panel)).toEqual(['content', 'control']);
    });

    describe('cta placement is unchanged', () => {
      const renderCta = (location: string | undefined, optInType: 'default' | 'card') => {
        const inputBody = node({
          selection: { type: 'cta', ...(location ? { location } : {}) },
          opt_in: { type: optInType, heading: { type: 'default' } },
        });
        const products = [quote('q1')];
        const o = offer({
          products,
          content: { positive_cta: 'Add', products: [{ id: 'q1', title: 'Standard' }] },
        });

        return render(inputBody, o, products).querySelector('.cge-input-option > .cge-button') as HTMLElement;
      };

      it('keeps the inline_end default for rows and honours bottom', () => {
        expect(renderCta(undefined, 'default').classList.contains('cge-button-inline-end')).toBe(true);
        expect(renderCta('inline_end', 'default').classList.contains('cge-button-inline-end')).toBe(true);
        expect(renderCta('bottom', 'default').classList.contains('cge-button-inline-end')).toBe(false);
      });

      it('keeps the bottom default for cards and honours inline_end', () => {
        expect(renderCta(undefined, 'card').classList.contains('cge-button-inline-end')).toBe(false);
        expect(renderCta('bottom', 'card').classList.contains('cge-button-inline-end')).toBe(false);
        expect(renderCta('inline_end', 'card').classList.contains('cge-button-inline-end')).toBe(true);
      });

      it('falls back to the layout default for inline_start or an unknown value', () => {
        for (const location of ['inline_start', 'nonsense']) {
          expect(renderCta(location, 'default').classList.contains('cge-button-inline-end'), `row ${location}`).toBe(
            true,
          );
          expect(renderCta(location, 'card').classList.contains('cge-button-inline-end'), `card ${location}`).toBe(
            false,
          );
        }
      });
    });
  });

  it('renders per-product inclusions and exclusions lists inside the option body', () => {
    const inputBody = node({
      opt_in: {
        type: 'default',
        heading: { type: 'default' },
        inclusions: { type: 'default' },
        exclusions: { type: 'default' },
      },
    });
    const products = [quote('q1')];
    const o = offer({
      products,
      content: {
        products: [
          {
            id: 'q1',
            title: 'Standard',
            inclusions: { 'trip-cancellation': 'Trip cancellation' },
            exclusions: { 'pre-existing': 'Pre-existing conditions' },
          },
        ],
      },
    });

    const el = render(inputBody, o, products);
    const option = el.querySelector(`[${CG_ATTR.role}="${CG_ROLE.option}"]`) as HTMLElement;
    const lists = option.querySelectorAll('.cge-list');

    expect(lists).toHaveLength(2);
    expect(lists[0].textContent).toContain('Trip cancellation');
    expect(lists[1].textContent).toContain('Pre-existing conditions');
    expect(lists[0].classList.contains('cge-input-option-list')).toBe(true);
    expect(lists[1].classList.contains('cge-input-option-list')).toBe(true);
    expect(lists[0].querySelector('.cge-list-tick-exclusion')).toBeNull();
    expect(lists[1].querySelector('.cge-list-tick-exclusion')).not.toBeNull();
  });

  it('applies the derived control type to every option', () => {
    const inputBody = node({ opt_in: { type: 'default', heading: { type: 'default' } } });
    const products = [quote('q1'), quote('q2')];
    const o = offer({
      products,
      content: {
        products: [
          { id: 'q1', title: 'A' },
          { id: 'q2', title: 'B' },
        ],
      },
    });

    const el = render(inputBody, o, products);
    const inputs = el.querySelectorAll('input');

    expect(inputs).toHaveLength(2);
    for (const input of inputs) expect((input as HTMLInputElement).type).toBe('radio');
  });

  describe('multiple selection (max_select > 1)', () => {
    const multiple = {
      ...defaultSelectionBehavior(['q1', 'q2']),
      control: 'checkbox' as const,
      multiple: true,
      maxSelect: 2,
    };

    const renderMulti = (extra: Record<string, unknown>) => {
      const inputBody = node({
        opt_in: { type: 'default', heading: { type: 'default' } },
        opt_out: { type: 'default', heading: { type: 'default' } },
        ...extra,
      });
      const products = [quote('q1'), quote('q2')];
      const o = offer({
        products,
        content: {
          positive_cta: 'Add',
          negative_cta: 'No',
          products: [
            { id: 'q1', title: 'A' },
            { id: 'q2', title: 'B' },
          ],
        },
      });
      const content = bindSection('input_body', inputBody, o, ctx(), products);

      return inputBodyBuilder({ node: inputBody, content, selection: multiple, ctx: ctx(), doc: document, products });
    };

    it('renders opt_in as checkboxes and the decline as a radio', () => {
      const el = renderMulti({});
      const types = Array.from(el.querySelectorAll('input')).map((i) => i.type);

      expect(types).toEqual(['checkbox', 'checkbox', 'radio']);
    });

    it('stamps the multiple mode and the cap on the options container', () => {
      const container = renderMulti({}).querySelector('.cge-input-body-options');

      expect([container?.getAttribute(CG_ATTR.selectMode), container?.getAttribute(CG_ATTR.maxSelect)]).toEqual([
        'multiple',
        '2',
      ]);
    });

    it('stamps the multiple mode for the cta selector type too', () => {
      const container = renderMulti({ selection: { type: 'cta' } }).querySelector('.cge-input-body-options');

      expect(container?.getAttribute(CG_ATTR.selectMode)).toBe('multiple');
    });

    it('does not stamp a mode on an exclusive group', () => {
      const inputBody = node({ opt_in: { type: 'default' } });
      const el = render(inputBody, offer({ products: [quote('q1')] }), [quote('q1')]);

      expect(el.querySelector('.cge-input-body-options')?.hasAttribute(CG_ATTR.selectMode)).toBe(false);
    });
  });

  it('orders inline-end price and badge in the option header, with the CTA as a panel-level sibling', () => {
    const inputBody = node({
      selection: { type: 'cta', location: 'inline_end' },
      opt_in: {
        type: 'default',
        heading: { type: 'default' },
        badge: { type: 'default', location: 'inline_end' },
        price: { type: 'block', location: 'inline_end' },
      },
    });
    const products = [quote('q1', undefined, 12.5)];
    const o = offer({
      products,
      content: {
        positive_cta: 'Add cover',
        price_unit: 'per trip',
        products: [{ id: 'q1', title: 'Standard', credibility_badge: 'Popular' }],
      },
    });

    const el = render(inputBody, o, products);
    const panel = el.querySelector('.cge-input-option') as HTMLElement;
    const trailing = panel.querySelector('.cge-input-option-header-trailing') as HTMLElement;

    expect(trailing.children).toHaveLength(2);
    expect(trailing.children[0].classList.contains('cge-price')).toBe(true);
    expect(trailing.children[1].classList.contains('cge-badge')).toBe(true);
    expect(panel.lastElementChild?.tagName).toBe('BUTTON');
    expect(panel.lastElementChild?.classList.contains('cge-button-inline-end')).toBe(true);
  });

  it('uses CTA labels and buttons when selection.type is cta', () => {
    const inputBody = node({
      selection: { type: 'cta', location: 'bottom' },
      opt_in: { type: 'card', heading: { type: 'default' } },
      opt_out: { type: 'default', heading: { type: 'default' } },
    });
    const products = [quote('q1')];
    const o = offer({
      products,
      content: {
        positive_cta: 'Add cover',
        negative_cta: 'No thanks',
        products: [{ id: 'q1', title: 'Standard' }],
      },
    });

    const el = render(inputBody, o, products);
    const optIn = el.querySelector(`[${CG_ATTR.role}="${CG_ROLE.option}"]`) as HTMLElement;
    const submit = optIn.querySelector(`button[${CG_ATTR.role}="${CG_ROLE.submit}"]`) as HTMLButtonElement;
    const optOut = el.querySelector(`[${CG_ATTR.role}="${CG_ROLE.decline}"]`) as HTMLElement;
    const decline = optOut.querySelector(`button[${CG_ATTR.role}="${CG_ROLE.decline}"]`) as HTMLButtonElement;

    expect(el.querySelector('input')).toBeNull();
    expect(optIn.querySelector('.cge-input-option-label')?.textContent).toBe('Standard');
    expect(submit.querySelector('.cge-button-label-resting')?.textContent).toBe('Add cover');
    expect(submit.querySelector('.cge-button-label-selected')?.textContent).toBe('Added');
    expect(submit.getAttribute(CG_ATTR.productIds)).toBe('q1');
    expect(submit.getAttribute(CG_ATTR.optionId)).toBe('opt_in_1');
    expect(optOut.querySelector('.cge-input-option-label')?.textContent).toBe('No thanks');
    expect(decline.querySelector('.cge-button-label-resting')?.textContent).toBe('No thanks');
    expect(decline.querySelector('.cge-button-label-selected')?.textContent).toBe("Don't add protection");
    expect(decline.getAttribute(CG_ATTR.productIds)).toBe('');
    expect(decline.getAttribute(CG_ATTR.optionId)).toBe('opt_out');
  });
});
