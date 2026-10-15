import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { resolvePresentation } from '../resolver/resolver';
import { clearBuilders } from '../resolver/registry';
import { registerSectionBuilders } from '../resolver/builders';
import { resolveContext } from '../shared/context';
import type { OfferResponse } from '../shared/types';

/**
 * A DOM-asserting coverage matrix for the Presentation Layout Specification,
 * run against the *real* registered section builders
 * (registerSectionBuilders), not the mock tier the other resolver specs use.
 * `layout` presence is necessary but not
 * sufficient, a node with no matching bound content degrades to present-but-
 * empty rather than an error, which looks identical to "the toggle does
 * nothing" from a browser. These tests pin that behaviour explicitly (both
 * the "it shows up" and the "it silently doesn't" cases) so a future change
 * to a builder, `NODE_ROUTING`, or a content field name fails a specific,
 * readable test instead of only being caught by manual QA.
 *
 * Extend this file's `describe` blocks as more nodes are covered; it is the
 * intended home for one case-pair (content present / content absent) per
 * closed-vocabulary node, not a one-off regression test.
 */

const ctx = () => resolveContext({ environment: 'sandbox', debug: false });

function offer(
  layout: unknown,
  content: Record<string, unknown>,
  products: OfferResponse['products'] = [],
): OfferResponse {
  return {
    id: 'o1',
    offer_config_id: 'oc1',
    offer_schema: 'schema-1',
    currency: 'USD',
    products,
    content,
    presentation: { schema_version: '1.0', ref: 'r1', theme: {}, layout },
  } as OfferResponse;
}

function renderToDiv(
  layout: unknown,
  content: Record<string, unknown>,
  products: OfferResponse['products'] = [],
): HTMLDivElement {
  const result = resolvePresentation(offer(layout, content, products), ctx());
  if (!('dom' in result)) throw new Error(`expected dom, got error: ${JSON.stringify(result)}`);
  const container = document.createElement('div');
  container.appendChild(result.dom);
  return container;
}

describe('presentation contract: real builders against the layout schema', () => {
  beforeEach(() => registerSectionBuilders());
  afterEach(() => clearBuilders());

  describe('header.badge (content.extras.credibility_badge, offer-level)', () => {
    const layout = { header: { type: 'default', badge: { type: 'default', location: 'inline_end' } } };

    it('renders the badge when extras.credibility_badge is present', () => {
      const dom = renderToDiv(layout, { extras: { credibility_badge: 'TRENDING' } });

      const badge = dom.querySelector('.cge-badge');
      expect(badge?.textContent).toBe('TRENDING');
    });

    it('renders nothing for the badge when extras.credibility_badge is absent, even though the node is present', () => {
      const dom = renderToDiv(layout, { extras: {} });

      expect(dom.querySelector('.cge-badge')).toBeNull();
    });
  });

  describe('footer.disclaimer (type: html, content.disclaimer_html, offer-level)', () => {
    const layout = { footer: { type: 'default', disclaimer: { type: 'html' } } };

    it('renders the disclaimer text when disclaimer_html is non-empty', () => {
      const dom = renderToDiv(layout, { disclaimer_html: '<p>Sold by Cover Genius.</p>' });

      expect(dom.querySelector('.cge-footer-disclaimer')?.textContent).toContain('Sold by Cover Genius.');
    });

    // disclaimer_html === '' (a real string, not undefined), which
    // resolveContent/reconstructDisclaimer treat as valid rich text, not "no
    // content". The default-on footer.disclaimer node still renders its
    // wrapper element, just with no visible text, indistinguishable in a
    // browser from "the toggle did nothing".
    it('renders an empty (but present) disclaimer wrapper when disclaimer_html is an empty string', () => {
      const dom = renderToDiv(layout, { disclaimer_html: '' });

      const disclaimer = dom.querySelector('.cge-footer-disclaimer');
      expect(disclaimer).not.toBeNull();
      expect(disclaimer?.textContent).toBe('');
    });

    it('omits the disclaimer wrapper entirely when disclaimer_html is absent', () => {
      const dom = renderToDiv(layout, {});

      expect(dom.querySelector('.cge-footer-disclaimer')).toBeNull();
    });
  });

  describe('bottom_body.testimonial_panel (flat content.extras.testimonial_*, offer-level)', () => {
    const layout = { bottom_body: { type: 'default', testimonial_panel: { type: 'default' } } };

    it('renders the testimonial when extras.testimonial_text is present', () => {
      const dom = renderToDiv(layout, {
        extras: { testimonial_text: 'Great service', testimonial_rating: '5', testimonial_author: 'Jane' },
      });

      const panel = dom.querySelector('.cge-testimonial-panel');
      expect(panel?.querySelector('.cge-testimonial-quote')?.textContent).toContain('Great service');
      expect(panel?.querySelector('.cge-testimonial-cite')?.textContent).toBe('Jane');
    });

    it('renders nothing for the testimonial panel when extras.testimonial_text is absent', () => {
      const dom = renderToDiv(layout, { extras: {} });

      expect(dom.querySelector('.cge-testimonial-panel')).toBeNull();
    });
  });

  describe('top_body.inclusions / exclusions (content.products[i].{inclusions,exclusions}, product-level)', () => {
    const layout = {
      top_body: { type: 'default', inclusions: { type: 'default' }, exclusions: { type: 'default' } },
    };
    const products = [{ id: 'q1' }] as OfferResponse['products'];

    it('renders list items when the product content has entries', () => {
      const dom = renderToDiv(
        layout,
        { products: [{ id: 'q1', inclusions: { i1: 'Covered thing' }, exclusions: {} }] },
        products,
      );

      const items = dom.querySelectorAll('.cge-section-top-body .cge-list-tick-item');
      expect(items.length).toBeGreaterThan(0);
      expect(dom.textContent).toContain('Covered thing');
    });

    it('renders an empty (but present) list when the product content object has no keys', () => {
      const dom = renderToDiv(layout, { products: [{ id: 'q1', inclusions: {}, exclusions: {} }] }, products);

      // The node/section still renders (an empty <ul class="cge-list">
      // wrapper is present); it just has no items, which reads as
      // "toggling this did nothing" in a browser.
      expect(dom.querySelectorAll('.cge-section-top-body .cge-list').length).toBeGreaterThan(0);
      expect(dom.querySelectorAll('.cge-list-tick-item').length).toBe(0);
    });
  });
});
