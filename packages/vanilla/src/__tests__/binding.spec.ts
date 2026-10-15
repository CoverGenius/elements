import { describe, expect, it, vi } from 'vitest';
import { resolveContext } from '../shared/context';
import { bindSection } from '../resolver/binding';
import type { BoundContent } from '../resolver/binding';
import type { LayoutNode } from '../resolver/layout';
import type { OfferResponse, Product } from '../shared/types';

function ctx(debug = false) {
  return resolveContext({ environment: 'sandbox', debug });
}

/**
 * Unwraps an opt_in/opt_out sub-bundle's entries for assertion. opt_out is a
 * single `bundle`; opt_in is a `bundle_list` (one entry per product group), so
 * this returns the first group's entries for these single-product cases.
 */
function entries(bundle: BoundContent | undefined): Record<string, BoundContent> {
  if (bundle?.kind === 'bundle') return bundle.entries;
  if (bundle?.kind === 'bundle_list') return bundle.groups[0]?.entries ?? {};
  return {};
}

function quote(id: string, amount?: number, pdsUrl?: string): Product {
  const details: Record<string, unknown> = {};

  if (amount !== undefined) details.finance = { price: { total_amount: amount } };

  if (pdsUrl !== undefined) details.pds_url = pdsUrl;

  return Object.keys(details).length ? { id, details: details as Product['details'] } : { id };
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

describe('bindSection', () => {
  describe('offer-scope sections', () => {
    it('resolves header heading and badge from their sources', () => {
      const header = node({ heading: { type: 'default' }, badge: { type: 'default' } });
      const o = offer({ content: { heading: 'Protect your trip', extras: { credibility_badge: 'Recommended' } } });

      const bound = bindSection('header', header, o, ctx());

      expect(bound.heading).toEqual({ kind: 'text', value: 'Protect your trip' });
      expect(bound.badge).toEqual({ kind: 'text', value: 'Recommended' });
    });

    it('resolves top_body.heading from extras, not the offer heading field', () => {
      const topBody = node({ heading: { type: 'default' }, subheading: { type: 'default' } });
      const o = offer({
        content: { heading: 'HEADER', sub_heading: 'sub', extras: { top_body_heading: 'Body title' } },
      });

      const bound = bindSection('top_body', topBody, o, ctx());

      expect(bound.heading).toEqual({ kind: 'text', value: 'Body title' });
      expect(bound.subheading).toEqual({ kind: 'text', value: 'sub' });
    });

    it('binds top info panel title and message as one content value', () => {
      const topBody = node({ info_panel: { type: 'default', location: 'middle' } });
      const o = offer({
        content: {
          extras: {
            top_info_panel_title: 'Important',
            top_info_panel_message: 'Review the coverage details.',
          },
        },
      });

      const bound = bindSection('top_body', topBody, o, ctx());

      expect(bound.info_panel).toEqual({
        kind: 'top_info_panel',
        title: 'Important',
        message: 'Review the coverage details.',
      });
    });

    it('resolves opt-in and bottom info panels from separate extras fields', () => {
      const products = [quote('q1')];
      const inputBody = node({ opt_in: { type: 'default', info_panel: { type: 'default', location: 'top' } } });
      const bottomBody = node({ info_panel: { type: 'default', location: 'bottom' } });
      const o = offer({
        products,
        content: {
          extras: {
            opt_in_info_panel_message: 'Shown in the option.',
            bottom_info_panel_message: 'Shown below the options.',
          },
          products: [{ id: 'q1', title: 'Standard' }],
        },
      });

      const inputBound = bindSection('input_body', inputBody, o, ctx(), products);
      const bottomBound = bindSection('bottom_body', bottomBody, o, ctx());

      expect(entries(inputBound.opt_in).info_panel).toEqual({ kind: 'text', value: 'Shown in the option.' });
      expect(bottomBound.info_panel).toEqual({ kind: 'text', value: 'Shown below the options.' });
    });

    it('omits a present node whose content is absent, without throwing', () => {
      const header = node({ heading: { type: 'default' } });

      const bound = bindSection('header', header, offer(), ctx());

      expect(bound).toEqual({});
    });
  });

  describe('product-scope nodes and the representative product', () => {
    it('resolves benefits from the representative product content, joined by id', () => {
      const topBody = node({ benefits: { type: 'default' } });
      const o = offer({
        products: [quote('q1'), quote('q2')],
        content: {
          products: [
            { id: 'q1', benefits: { b1: 'Covered' } },
            { id: 'q2', benefits: { b2: 'Other' } },
          ],
        },
      });

      const bound = bindSection('top_body', topBody, o, ctx());

      expect(bound.benefits).toEqual({ kind: 'list', items: [{ name: 'b1', text: 'Covered' }] });
    });

    it('resolves list heading bundled inside list content when list node has heading child', () => {
      const topBody = node({
        heading: { type: 'default' },
        benefits: { type: 'default', heading: { type: 'default' } },
      });
      const o = offer({
        products: [quote('q1')],
        content: {
          extras: {
            top_body_heading: 'Main Section Title',
            benefits_heading: 'Key Benefits Covered',
          },
          products: [{ id: 'q1', benefits: { b1: 'Trip Cancellation' } }],
        },
      });

      const bound = bindSection('top_body', topBody, o, ctx());

      expect(bound.heading).toEqual({ kind: 'text', value: 'Main Section Title' });
      expect(bound.benefits).toEqual({
        kind: 'list',
        heading: 'Key Benefits Covered',
        items: [{ name: 'b1', text: 'Trip Cancellation' }],
      });
    });

    it('resolves inclusions and exclusions headings bundled inside their list content', () => {
      const topBody = node({
        inclusions: { type: 'default', heading: { type: 'default' } },
        exclusions: { type: 'default', heading: { type: 'default' } },
      });
      const o = offer({
        products: [quote('q1')],
        content: {
          extras: {
            inclusions_heading: 'What is Included',
            exclusions_heading: 'What is Not Covered',
          },
          products: [
            {
              id: 'q1',
              inclusions: { i1: 'Medical' },
              exclusions: { e1: 'Pre-existing conditions' },
            },
          ],
        },
      });

      const bound = bindSection('top_body', topBody, o, ctx());

      expect(bound.inclusions).toEqual({
        kind: 'list',
        heading: 'What is Included',
        items: [{ name: 'i1', text: 'Medical' }],
      });
      expect(bound.exclusions).toEqual({
        kind: 'list',
        heading: 'What is Not Covered',
        items: [{ name: 'e1', text: 'Pre-existing conditions' }],
      });
    });

    it('degrades product-scope nodes to no entry when the offer has no products', () => {
      const topBody = node({ benefits: { type: 'default' } });

      const bound = bindSection('top_body', topBody, offer({ products: [] }), ctx());

      expect(bound).toEqual({});
    });
  });

  describe('composed nodes', () => {
    it('resolves price to a formatted amount plus the price_unit label', () => {
      const inputBody = node({ opt_in: { type: 'card', price: { type: 'default' } } });
      const o = offer({
        currency: 'USD',
        products: [quote('q1', 12.5)],
        content: { price_unit: 'per night' },
      });

      const bound = bindSection('input_body', inputBody, o, ctx());

      expect(entries(bound.opt_in).price).toEqual({
        kind: 'price',
        formatted: '$12.50',
        label: 'per night',
      });
    });

    it('resolves a text disclaimer and its terms_link', () => {
      const footer = node({ disclaimer: { type: 'text', terms_link: { type: 'default' } } });
      const o = offer({
        products: [quote('q1', undefined, 'https://cg.example/pds.pdf')],
        content: { disclaimer: 'Small print', products: [{ id: 'q1', terms_cta: 'Read terms' }] },
      });

      const bound = bindSection('footer', footer, o, ctx());

      expect(bound.disclaimer).toEqual({ kind: 'text', value: 'Small print' });
      expect(bound.terms_link).toEqual({ kind: 'link', href: 'https://cg.example/pds.pdf', label: 'Read terms' });
    });

    it('resolves the legacy default disclaimer type as HTML', () => {
      const footer = node({ disclaimer: { type: 'default' } });
      const o = offer({ content: { disclaimer_html: '<p>Small print</p>' } });

      const bound = bindSection('footer', footer, o, ctx());

      expect(bound.disclaimer?.kind).toBe('richText');
    });

    it('resolves multi-link array for opt_in.links from pds_url and ipid_url', () => {
      const inputBody = node({ opt_in: { type: 'card', links: { type: 'default' } } });
      const o = offer({
        products: [quote('q1', undefined, 'https://cg.example/pds.pdf')],
        content: {
          extras: { ipid_url: 'https://cg.example/ipid.pdf', ipid_label: 'IPID Doc' },
          products: [{ id: 'q1', terms_cta: 'Product terms' }],
        },
      });

      const bound = bindSection('input_body', inputBody, o, ctx());

      expect(entries(bound.opt_in).links).toEqual({
        kind: 'links',
        links: [
          { href: 'https://cg.example/pds.pdf', label: 'Product terms' },
          { href: 'https://cg.example/ipid.pdf', label: 'IPID Doc' },
        ],
      });
    });

    it('resolves testimonial_panel from offer extras', () => {
      const bottomBody = node({ testimonial_panel: { type: 'default' } });
      const o = offer({
        content: {
          extras: {
            testimonial_text: 'Great coverage!',
            testimonial_rating: '5',
            testimonial_author: 'Jane D.',
            testimonial_date: 'March 2025',
          },
        },
      });

      const bound = bindSection('bottom_body', bottomBody, o, ctx());

      expect(bound.testimonial_panel).toEqual({
        kind: 'testimonial',
        testimonial: {
          text: 'Great coverage!',
          rating: '5',
          author: 'Jane D.',
          date: 'March 2025',
        },
      });
    });
  });

  describe('input_body CTA labels', () => {
    it('binds positive and negative CTA labels when selection.type is cta', () => {
      const inputBody = node({ selection: { type: 'cta', location: 'bottom' } });
      const o = offer({ content: { positive_cta: 'Add cover', negative_cta: 'No thanks' } });

      const bound = bindSection('input_body', inputBody, o, ctx());

      expect(bound.selection).toEqual({
        kind: 'selection_cta',
        positiveLabel: 'Add cover',
        negativeLabel: 'No thanks',
        positiveSelectedLabel: 'Added',
        negativeSelectedLabel: "Don't add protection",
      });
    });

    it("binds selected CTA labels from content.extras, falling back to Added / Don't add protection", () => {
      const inputBody = node({ selection: { type: 'cta', location: 'bottom' } });
      const o = offer({
        content: {
          positive_cta: 'Add cover',
          negative_cta: 'No thanks',
          extras: { positive_cta_selected: 'Covered', negative_cta_selected: 'Skipped' },
        },
      });

      const bound = bindSection('input_body', inputBody, o, ctx());

      expect(bound.selection).toMatchObject({ positiveSelectedLabel: 'Covered', negativeSelectedLabel: 'Skipped' });
    });
  });

  describe('input_body scoped sub-bundles', () => {
    it('resolves opt_in and opt_out as clean sub-bundles', () => {
      const inputBody = node({
        opt_in: {
          type: 'card',
          heading: { type: 'default' },
          description: { type: 'default' },
          badge: { type: 'default' },
          benefits: { type: 'default', heading: { type: 'default' } },
        },
        opt_out: {
          type: 'default',
          heading: { type: 'default' },
          description: { type: 'default' },
          warning_panel: { type: 'default' },
        },
      });
      const o = offer({
        products: [quote('q1')],
        content: {
          negative_cta: 'I decline',
          negative_cta_warning: 'You will not be covered',
          extras: {
            opt_out_description: 'I accept full risk',
            benefits_heading: 'Coverage Features',
          },
          products: [
            {
              id: 'q1',
              title: 'Comprehensive Plan',
              description: 'Single-trip protection',
              credibility_badge: 'Popular',
              benefits: { b1: 'Trip protection' },
            },
          ],
        },
      });

      const bound = bindSection('input_body', inputBody, o, ctx());

      expect(entries(bound.opt_in).heading).toEqual({ kind: 'text', value: 'Comprehensive Plan' });
      expect(entries(bound.opt_in).description).toEqual({
        kind: 'text',
        value: 'Single-trip protection',
      });
      expect(entries(bound.opt_in).badge).toEqual({ kind: 'text', value: 'Popular' });
      expect(entries(bound.opt_in).benefits).toEqual({
        kind: 'list',
        heading: 'Coverage Features',
        items: [{ name: 'b1', text: 'Trip protection' }],
      });

      expect(entries(bound.opt_out).heading).toEqual({ kind: 'text', value: 'I decline' });
      expect(entries(bound.opt_out).description).toEqual({ kind: 'text', value: 'I accept full risk' });
      expect(entries(bound.opt_out).warning_panel).toEqual({
        kind: 'text',
        value: 'You will not be covered',
      });
    });
  });

  describe('token substitution', () => {
    it('substitutes {order_total_price} from offer extras, formatted in the offer currency', () => {
      const header = node({ heading: { type: 'default' } });
      const o = offer({
        currency: 'USD',
        content: { heading: 'Total {order_total_price}', extras: { order_total_price: '196.26' } },
      });

      const bound = bindSection('header', header, o, ctx());

      expect(bound.heading).toEqual({ kind: 'text', value: 'Total $196.26' });
    });

    it('substitutes {quote_total_price} in offer-scope copy from the section representative', () => {
      const topBody = node({ subheading: { type: 'default' } });
      const o = offer({
        currency: 'USD',
        products: [quote('q1', 42), quote('q2', 99)],
        content: { sub_heading: 'Cover from {quote_total_price}', products: [{ id: 'q1' }, { id: 'q2' }] },
      });

      const bound = bindSection('top_body', topBody, o, ctx());

      expect(bound.subheading).toEqual({ kind: 'text', value: 'Cover from $42.00' });
    });

    it('substitutes the aggregated group sum for {quote_total_price} when aggregate_products is on', () => {
      const q1 = quote('q1', 10);
      const q2 = quote('q2', 15);
      q1.product_config_id = 'c1';
      q2.product_config_id = 'c1';
      const topBody = node({ aggregate_products: true, description: { type: 'default' } });
      const o = offer({
        currency: 'USD',
        products: [q1, q2],
        content: { description: 'Bundle for {quote_total_price}' },
      });

      const bound = bindSection('top_body', topBody, o, ctx());

      expect(bound.description).toEqual({ kind: 'text', value: 'Bundle for $25.00' });
    });

    it('substitutes each opt_in group with its own premium', () => {
      const inputBody = node({ opt_in: { type: 'card', description: { type: 'default' } } });
      const o = offer({
        currency: 'USD',
        products: [quote('q1', 10), quote('q2', 30)],
        content: {
          products: [
            { id: 'q1', description: 'Basic for {quote_total_price}' },
            { id: 'q2', description: 'Full for {quote_total_price}' },
          ],
        },
      });

      const bound = bindSection('input_body', inputBody, o, ctx());

      expect(bound.opt_in?.kind).toBe('bundle_list');
      if (bound.opt_in?.kind === 'bundle_list') {
        expect(bound.opt_in.groups[0].entries.description).toEqual({
          kind: 'text',
          value: 'Basic for $10.00',
        });
        expect(bound.opt_in.groups[1].entries.description).toEqual({
          kind: 'text',
          value: 'Full for $30.00',
        });
      }
    });

    it('substitutes tokens in extras-backed copy and list item text', () => {
      const topBody = node({
        heading: { type: 'default' },
        benefits: { type: 'default', heading: { type: 'default' } },
      });
      const o = offer({
        currency: 'USD',
        products: [quote('q1', 12.5)],
        content: {
          extras: {
            top_body_heading: 'Only {order_total_price} today',
            order_total_price: '7.50',
            benefits_heading: 'Cover worth {quote_total_price}',
          },
          products: [{ id: 'q1', benefits: { b1: 'Medical up to {quote_total_price}' } }],
        },
      });

      const bound = bindSection('top_body', topBody, o, ctx());

      expect(bound.heading).toEqual({ kind: 'text', value: 'Only $7.50 today' });
      expect(bound.benefits).toEqual({
        kind: 'list',
        heading: 'Cover worth $12.50',
        items: [{ name: 'b1', text: 'Medical up to $12.50' }],
      });
    });

    it('substitutes tokens in selection CTA labels', () => {
      const inputBody = node({ selection: { type: 'cta' } });
      const o = offer({
        currency: 'USD',
        content: { positive_cta: 'Add for {order_total_price}', extras: { order_total_price: '8' } },
      });

      const bound = bindSection('input_body', inputBody, o, ctx());

      expect(bound.selection).toEqual({
        kind: 'selection_cta',
        positiveLabel: 'Add for $8.00',
        negativeLabel: 'No thanks',
        positiveSelectedLabel: 'Added',
        negativeSelectedLabel: "Don't add protection",
      });
    });

    it('strips an unknown token and debug-logs it through binding', () => {
      const c = ctx(true);
      const debug = vi.spyOn(c.logger, 'debug');
      const header = node({ heading: { type: 'default' } });
      const o = offer({ content: { heading: 'Hi {first_name}' } });

      const bound = bindSection('header', header, o, c);

      expect(bound.heading).toEqual({ kind: 'text', value: 'Hi ' });
      expect(debug).toHaveBeenCalledWith(
        'resolveContent: unresolved token',
        expect.objectContaining({ token: 'first_name' }),
      );
    });

    it('does not compute a representative when offer-scope copy has no token', () => {
      const c = ctx(true);
      const debug = vi.spyOn(c.logger, 'debug');
      const header = node({ heading: { type: 'default' } });
      const o = offer({
        products: [quote('q1')],
        content: { heading: 'Plain heading', products: [{ id: 'q2' }] },
      });

      bindSection('header', header, o, c);

      expect(debug).not.toHaveBeenCalledWith(
        'bindSection: no product content joined for representative',
        expect.anything(),
      );
    });
  });

  describe('discovery', () => {
    it('finds a terms_link nested inside a subheading', () => {
      const topBody = node({ subheading: { type: 'default', terms_link: { type: 'default' } } });
      const o = offer({
        products: [quote('q1', undefined, 'https://cg.example/pds.pdf')],
        content: { sub_heading: 'body', products: [{ id: 'q1' }] },
      });

      const bound = bindSection('top_body', topBody, o, ctx());

      expect(bound.subheading).toEqual({ kind: 'text', value: 'body' });
      expect(bound.terms_link).toEqual({ kind: 'link', href: 'https://cg.example/pds.pdf', label: 'View terms' });
    });

    it('skips a content-free node without a missing-routing warning', () => {
      const c = ctx(true);
      const debug = vi.spyOn(c.logger, 'debug');
      const header = node({ icon: { type: 'default' }, heading: { type: 'default' } });

      bindSection('header', header, offer({ content: { heading: 'x' } }), c);

      expect(debug).not.toHaveBeenCalledWith(
        'bindSection: no routing for node',
        expect.objectContaining({ name: 'icon' }),
      );
    });

    it('skips content-free trustpilot_panel without a missing-routing warning', () => {
      const c = ctx(true);
      const debug = vi.spyOn(c.logger, 'debug');
      const bottomBody = node({ trustpilot_panel: { type: 'default' }, heading: { type: 'default' } });

      bindSection('bottom_body', bottomBody, offer({ content: { extras: { bottom_body_heading: 'Trust' } } }), c);

      expect(debug).not.toHaveBeenCalledWith(
        'bindSection: no routing for node',
        expect.objectContaining({ name: 'trustpilot_panel' }),
      );
    });

    it('debug-logs an unmapped node and does not throw', () => {
      const c = ctx(true);
      const debug = vi.spyOn(c.logger, 'debug');
      const header = node({ mystery_node: { type: 'default' } });

      expect(() => bindSection('header', header, offer(), c)).not.toThrow();
      expect(debug).toHaveBeenCalledWith('bindSection: no routing for node', {
        section: 'header',
        name: 'mystery_node',
      });
    });

    it('ignores scalar layout fields such as align', () => {
      const inputBody = node({ align: 'right', opt_in: { type: 'card', heading: { type: 'default' } } });
      const o = offer({ products: [quote('q1')], content: { products: [{ id: 'q1', title: 'Plan A' }] } });

      const bound = bindSection('input_body', inputBody, o, ctx());

      expect(entries(bound.opt_in).heading).toEqual({ kind: 'text', value: 'Plan A' });
      expect(bound.align).toBeUndefined();
    });
  });

  describe('aggregation', () => {
    it('uses the first group representative when aggregate_products is true', () => {
      const inputBody = node({ aggregate_products: true, benefits: { type: 'default' } });
      const o = offer({
        products: [quote('q1'), quote('q2')],
        content: {
          products: [
            { id: 'q1', benefits: { b1: 'First' } },
            { id: 'q2', benefits: { b2: 'Second' } },
          ],
        },
      });

      const bound = bindSection('input_body', inputBody, o, ctx());

      expect(bound.benefits).toEqual({ kind: 'list', items: [{ name: 'b1', text: 'First' }] });
    });

    it('sums the group premium for an aggregated price, not one member amount', () => {
      const q1 = quote('q1', 10);
      const q2 = quote('q2', 15);
      q1.product_config_id = 'c1';
      q2.product_config_id = 'c1';
      const inputBody = node({ aggregate_products: true, price: { type: 'default' } });
      const o = offer({ currency: 'USD', products: [q1, q2], content: {} });

      const bound = bindSection('input_body', inputBody, o, ctx());

      expect(bound.price).toEqual({ kind: 'price', formatted: '$25.00', label: undefined });
    });
  });

  describe('diagnostics', () => {
    it('debug-logs when the representative quote has no joined product content', () => {
      const c = ctx(true);
      const debug = vi.spyOn(c.logger, 'debug');
      const topBody = node({ benefits: { type: 'default' } });
      const o = offer({ products: [quote('q1')], content: { products: [{ id: 'q2' }] } });

      bindSection('top_body', topBody, o, c);

      expect(debug).toHaveBeenCalledWith('bindSection: no product content joined for representative', { id: 'q1' });
    });
  });

  describe('scoped products (fifth param)', () => {
    it('resolves the representative from the scoped products, not offer.products, when the first offer product is excluded', () => {
      const topBody = node({ benefits: { type: 'default' } });
      const o = offer({
        products: [quote('q1'), quote('q2')],
        content: {
          products: [
            { id: 'q1', benefits: { b1: 'Excluded plan benefit' } },
            { id: 'q2', benefits: { b2: 'Included plan benefit' } },
          ],
        },
      });

      const bound = bindSection('top_body', topBody, o, ctx(), [quote('q2')]);

      expect(bound.benefits).toEqual({ kind: 'list', items: [{ name: 'b2', text: 'Included plan benefit' }] });
    });

    it('defaults to offer.products when no scoped list is passed', () => {
      const topBody = node({ benefits: { type: 'default' } });
      const o = offer({
        products: [quote('q1')],
        content: { products: [{ id: 'q1', benefits: { b1: 'Only plan benefit' } }] },
      });

      const bound = bindSection('top_body', topBody, o, ctx());

      expect(bound.benefits).toEqual({ kind: 'list', items: [{ name: 'b1', text: 'Only plan benefit' }] });
    });

    it('does not compute a representative, or log about one, for a section with no product-scope node', () => {
      const c = ctx(true);
      const debug = vi.spyOn(c.logger, 'debug');
      const header = node({ heading: { type: 'default' } });
      const o = offer({
        products: [quote('q1')],
        content: { heading: 'Offer heading', products: [{ id: 'q2' }] },
      });

      const bound = bindSection('header', header, o, c);

      expect(bound.heading).toEqual({ kind: 'text', value: 'Offer heading' });
      expect(debug).not.toHaveBeenCalledWith(
        'bindSection: no product content joined for representative',
        expect.anything(),
      );
    });

    it('computes the representative once per bindSection call even when multiple nodes consume it', () => {
      const c = ctx(true);
      const debug = vi.spyOn(c.logger, 'debug');
      const topBody = node({ benefits: { type: 'default' }, price: { type: 'default' } });
      const o = offer({ currency: 'USD', products: [quote('q1', 10)], content: { products: [{ id: 'q2' }] } });

      bindSection('top_body', topBody, o, c);

      const misses = debug.mock.calls.filter(
        ([msg]) => msg === 'bindSection: no product content joined for representative',
      );

      expect(misses).toHaveLength(1);
    });
  });
});
