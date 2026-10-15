import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { resolvePresentation } from '../resolver/resolver';
import { registerBuilder, clearBuilders } from '../resolver/registry';
import { createMockBuilder } from '../resolver/builders/mock';
import { resolveContext } from '../shared/context';
import { SECTION_ORDER } from '../resolver/layout';
import type { BuildArgs } from '../resolver/builder';
import type { OfferResponse } from '../shared/types';

const ctx = () => resolveContext({ environment: 'sandbox', debug: true });

function offer(presentation: unknown): OfferResponse {
  return {
    id: 'o1',
    offer_config_id: 'oc1',
    offer_schema: 'schema-1',
    currency: 'USD',
    products: [],
    content: {},
    presentation,
  } as OfferResponse;
}

const validPresentation = {
  schema_version: '1.0',
  ref: 'r1',
  variant: 'v1',
  theme: {},
  layout: {
    header: { type: 'default' },
    input_body: { type: 'card' },
  },
};

const nodeKinds = (dom: DocumentFragment) => [...dom.children].map((c) => (c as HTMLElement).dataset.cgNode);

describe('resolvePresentation', () => {
  beforeEach(() => {
    for (const section of SECTION_ORDER) {
      registerBuilder(section, 'default', createMockBuilder(section));
    }
  });

  afterEach(() => clearBuilders());

  it('builds DOM for a minimal valid presentation via the walk', () => {
    const result = resolvePresentation(offer(validPresentation), ctx());

    if (!('dom' in result)) throw new Error('expected dom');

    expect(nodeKinds(result.dom)).toEqual(['header', 'input_body']);
  });

  it('walks sections in fixed order regardless of authored order', () => {
    const layout = { footer: { type: 'default' }, header: { type: 'default' } };

    const result = resolvePresentation(offer({ ...validPresentation, layout }), ctx());

    if (!('dom' in result)) throw new Error('expected dom');

    expect(nodeKinds(result.dom)).toEqual(['header', 'footer']);
  });

  it('skips a section whose kind has no registered builder', () => {
    clearBuilders();
    registerBuilder('header', 'default', createMockBuilder('header'));

    const result = resolvePresentation(offer(validPresentation), ctx());

    if (!('dom' in result)) throw new Error('expected dom');

    expect(nodeKinds(result.dom)).toEqual(['header']);
  });

  it('errors on an empty presentation', () => {
    const result = resolvePresentation(offer({}), ctx());

    expect('error' in result && result.error.code).toBe('presentation_empty');
  });

  it('errors on a missing presentation', () => {
    const result = resolvePresentation(offer(undefined), ctx());

    expect('error' in result && result.error.code).toBe('presentation_empty');
  });

  it('errors on an unsupported schema_version', () => {
    const result = resolvePresentation(offer({ ...validPresentation, schema_version: '999.0' }), ctx());

    expect('error' in result && result.error.code).toBe('schema_version_unsupported');
  });

  it('errors as malformed when a non-empty presentation is missing schema_version', () => {
    const result = resolvePresentation(offer({ ref: 'r1' }), ctx());

    expect('error' in result && result.error.code).toBe('presentation_malformed');
  });

  const noLayout = { schema_version: '1.0', ref: 'r1', variant: 'v1', theme: {} };

  it('errors as malformed when a valid presentation has no layout', () => {
    const result = resolvePresentation(offer(noLayout), ctx());

    expect('error' in result && result.error.code).toBe('presentation_malformed');
  });

  it('does not throw when layout is missing', () => {
    expect(() => resolvePresentation(offer(noLayout), ctx())).not.toThrow();
  });

  it('degrades an unknown type on every section to the kind default without throwing', () => {
    const layout = Object.fromEntries(SECTION_ORDER.map((s) => [s, { type: 'totally-unknown' }]));
    const call = () => resolvePresentation(offer({ ...validPresentation, layout }), ctx());

    expect(call).not.toThrow();

    const result = call();

    if (!('dom' in result)) throw new Error('expected dom');

    expect(nodeKinds(result.dom)).toEqual([...SECTION_ORDER]);
  });

  it('never throws to the caller on the error path', () => {
    expect(() => resolvePresentation(offer({}), ctx())).not.toThrow();
    expect(() => resolvePresentation(offer(undefined), ctx())).not.toThrow();
    expect(() => resolvePresentation(offer({ ...validPresentation, schema_version: '999.0' }), ctx())).not.toThrow();
  });

  it('errors when the walk renders no sections', () => {
    const result = resolvePresentation(offer({ ...validPresentation, layout: {} }), ctx());

    expect('error' in result && result.error.code).toBe('presentation_empty');
  });
});

// Builders create nodes from a passed-in document (BuildArgs.doc), never a
// module-global `document`, so section builders stay pure. The
// resolver builds the fragment from the same document and defaults it to global.
describe('resolvePresentation: document threading', () => {
  afterEach(() => clearBuilders());

  it('passes a document to the builder via BuildArgs.doc', () => {
    let seen: BuildArgs | undefined;
    registerBuilder('header', 'default', (args) => {
      seen = args;
      return args.doc.createElement('div');
    });

    resolvePresentation(offer({ ...validPresentation, layout: { header: { type: 'default' } } }), ctx());

    expect(seen?.doc).toBe(document);
    expect(typeof seen?.doc.createElement).toBe('function');
  });

  it('threads a caller-supplied document to the builder', () => {
    const doc = document.implementation.createHTMLDocument('panel');
    let seen: Document | undefined;
    registerBuilder('header', 'default', (args) => {
      seen = args.doc;
      return args.doc.createElement('div');
    });

    resolvePresentation(offer({ ...validPresentation, layout: { header: { type: 'default' } } }), ctx(), doc);

    expect(seen).toBe(doc);
  });

  it('defaults the document to the global one when the caller omits it', () => {
    const seen: Document[] = [];
    registerBuilder('header', 'default', (args) => {
      seen.push(args.doc);
      return args.doc.createElement('div');
    });

    resolvePresentation(offer({ ...validPresentation, layout: { header: { type: 'default' } } }), ctx());

    expect(seen).toEqual([document]);
  });
});
