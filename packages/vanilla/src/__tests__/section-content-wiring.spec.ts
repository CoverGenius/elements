import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { resolvePresentation } from '../resolver/resolver';
import { registerBuilder, clearBuilders } from '../resolver/registry';
import { resolveContext } from '../shared/context';
import { SECTION_ORDER } from '../resolver/layout';
import type { BuildArgs, NodeBuilder } from '../resolver/builder';
import type { BoundContent } from '../resolver/binding';
import type { OfferResponse } from '../shared/types';

const ctx = () => resolveContext({ environment: 'sandbox', debug: true });

const captured: Record<string, Record<string, BoundContent> | undefined> = {};

function capturingBuilder(kind: string): NodeBuilder {
  return (args: BuildArgs) => {
    captured[kind] = args.content;
    return args.doc.createElement('div');
  };
}

function offer(layout: unknown, content: Record<string, unknown> = {}, products: unknown[] = []): OfferResponse {
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

// The four simple sections from the standard-white-card worked example.
const standardWhiteCard = {
  header: { type: 'default', heading: { type: 'default' }, icon: { type: 'default' } },
  top_body: {
    type: 'default',
    subheading: { type: 'default', terms_link: { type: 'default' } },
    required_panel: { type: 'default', location: 'bottom' },
  },
  bottom_body: { type: 'default', credibility_panel: { type: 'default' } },
  footer: { type: 'default', disclaimer: { type: 'html' }, logo: { type: 'default' } },
};

const standardWhiteCardContent = {
  heading: 'Protect your trip',
  sub_heading: 'Cover for the unexpected',
  required_message: 'Please choose an option',
  credibility_message: 'Trusted by millions',
  disclaimer_html: '<p>Terms and conditions apply</p>',
};

describe('section walk: content wiring', () => {
  beforeEach(() => {
    for (const kind of SECTION_ORDER) registerBuilder(kind, 'default', capturingBuilder(kind));
    for (const key of Object.keys(captured)) delete captured[key];
  });

  afterEach(() => clearBuilders());

  it('passes each section builder a resolved content bundle keyed by node name', () => {
    resolvePresentation(offer(standardWhiteCard, standardWhiteCardContent), ctx());

    expect(captured.header?.heading).toEqual({ kind: 'text', value: 'Protect your trip' });
    expect(captured.top_body?.subheading).toEqual({ kind: 'text', value: 'Cover for the unexpected' });
    expect(captured.top_body?.required_panel).toEqual({ kind: 'text', value: 'Please choose an option' });
    expect(captured.bottom_body?.credibility_panel).toEqual({ kind: 'text', value: 'Trusted by millions' });

    const disclaimer = captured.footer?.disclaimer;
    expect(disclaimer?.kind).toBe('richText');
    if (disclaimer?.kind === 'richText') {
      expect(disclaimer.nodes.textContent).toContain('Terms and conditions apply');
    }
  });

  it('gives the builder a bundle, not a single resolved value', () => {
    resolvePresentation(offer(standardWhiteCard, standardWhiteCardContent), ctx());

    expect(captured.header).toBeTypeOf('object');
    expect(captured.header).not.toHaveProperty('kind');
    expect(Object.keys(captured.header ?? {})).toContain('heading');
  });

  it('omits an absent content node from the bundle', () => {
    const layout = { header: { type: 'default', heading: { type: 'default' }, badge: { type: 'default' } } };

    resolvePresentation(offer(layout, { heading: 'Only a heading' }), ctx());

    expect(captured.header?.heading).toEqual({ kind: 'text', value: 'Only a heading' });
    expect(captured.header?.badge).toBeUndefined();
  });

  it('skips a content-free node without an entry', () => {
    const layout = { header: { type: 'default', heading: { type: 'default' }, icon: { type: 'default' } } };

    resolvePresentation(offer(layout, { heading: 'x' }), ctx());

    expect(captured.header?.icon).toBeUndefined();
    expect(captured.header?.heading).toBeDefined();
  });

  it('builds an empty bundle for a section whose content is absent, without failing', () => {
    const layout = { footer: { type: 'default', disclaimer: { type: 'html' } } };

    const result = resolvePresentation(offer(layout, {}), ctx());

    expect('dom' in result).toBe(true);
    expect(captured.footer).toEqual({});
  });

  it('resolves top_body benefits from the representative product content', () => {
    const layout = { top_body: { type: 'default', benefits: { type: 'default' } } };
    const content = { products: [{ id: 'q1', benefits: { b1: 'Covered' } }] };

    resolvePresentation(offer(layout, content, [{ id: 'q1' }]), ctx());

    expect(captured.top_body?.benefits).toEqual({ kind: 'list', items: [{ name: 'b1', text: 'Covered' }] });
  });

  it('applies the input_body section override, resolving opt_in heading from product title', () => {
    const layout = { input_body: { type: 'default', opt_in: { type: 'card', heading: { type: 'default' } } } };
    const content = { heading: 'OFFER HEADER', products: [{ id: 'q1', title: 'Cancel for any reason' }] };

    resolvePresentation(offer(layout, content, [{ id: 'q1' }]), ctx());

    const optInBundle = captured.input_body?.opt_in;
    const optIn = optInBundle?.kind === 'bundle_list' ? optInBundle.groups[0].entries : {};
    expect(optIn.heading).toEqual({
      kind: 'text',
      value: 'Cancel for any reason',
    });
  });
});
