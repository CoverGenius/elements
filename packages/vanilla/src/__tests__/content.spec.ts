import { describe, expect, it, vi } from 'vitest';
import { resolveContext } from '../shared/context';
import { resolveContent } from '../resolver/content';
import type { ContentScope, OfferLevelContent, ProductContent } from '../resolver/content-types';

function ctx(debug = false) {
  return resolveContext({ environment: 'sandbox', debug });
}

function offerScope(content: OfferLevelContent): ContentScope {
  return { kind: 'offer', content };
}

function productScope(content: ProductContent): ContentScope {
  return { kind: 'product', content };
}

describe('resolveContent', () => {
  it('returns undefined when the node has no content at that path', () => {
    expect(resolveContent('heading', offerScope({}), ctx())).toBeUndefined();
  });

  it('resolves a plain string field to a text node', () => {
    const result = resolveContent('heading', offerScope({ heading: 'Protect your trip' }), ctx());

    expect(result).toEqual({ kind: 'text', value: 'Protect your trip' });
  });

  it('resolves a list field (benefits/inclusions/exclusions) preserving name as the map key', () => {
    const content: ProductContent = { id: 'q1', benefits: { medical: 'Medical cover', baggage: 'Baggage cover' } };
    const result = resolveContent('benefits', productScope(content), ctx());

    expect(result).toEqual({
      kind: 'list',
      items: [
        { name: 'medical', text: 'Medical cover' },
        { name: 'baggage', text: 'Baggage cover' },
      ],
    });
  });

  it('degrades and debug-logs when a list field arrives as an array instead of a dict', () => {
    const context = ctx(true);
    const debugSpy = vi.spyOn(context.logger, 'debug');
    // Arrays are typeof 'object', so an untransformed CMS array shape must not slip
    // through and produce index-keyed items; it degrades like any non-object.
    const content = { id: 'q1', benefits: ['Medical cover', 'Baggage cover'] } as unknown as ProductContent;

    expect(resolveContent('benefits', productScope(content), context)).toBeUndefined();
    expect(debugSpy).toHaveBeenCalledWith('resolveContent: list field is not an object', expect.anything());
  });

  it('does not set icon on a resolved list item: theme.icons has no home on SdkContext yet', () => {
    const content: ProductContent = { id: 'q1', benefits: { medical: 'Medical cover' } };
    const result = resolveContent('benefits', productScope(content), ctx());

    expect(result).toEqual({ kind: 'list', items: [{ name: 'medical', text: 'Medical cover' }] });

    if (result?.kind === 'list') {
      expect(result.items[0].icon).toBeUndefined();
    }
  });

  it('resolves an HTML disclaimer from disclaimer_html', () => {
    const content: OfferLevelContent = {
      disclaimer: 'Terms apply (plain, no markup)',
      disclaimer_html: '<p>Terms apply</p>',
    };
    const result = resolveContent('disclaimer_html', offerScope(content), ctx());

    expect(result?.kind).toBe('richText');

    if (result?.kind === 'richText') {
      expect(result.nodes.textContent).toBe('Terms apply');
    }
  });

  it('resolves a text disclaimer from disclaimer', () => {
    const result = resolveContent('disclaimer', offerScope({ disclaimer: 'Terms apply' }), ctx());

    expect(result).toEqual({ kind: 'text', value: 'Terms apply' });
  });

  it('returns undefined and debug-logs when disclaimer_html is absent', () => {
    const context = ctx(true);
    const debugSpy = vi.spyOn(context.logger, 'debug');
    const content: OfferLevelContent = { disclaimer: 'Terms apply (plain, no markup)' };

    expect(resolveContent('disclaimer_html', offerScope(content), context)).toBeUndefined();
    expect(debugSpy).toHaveBeenCalledWith('resolveContent: no content for node', expect.anything());
  });

  it('returns undefined and debug-logs for a non-string, non-list field value', () => {
    const context = ctx(true);
    const debugSpy = vi.spyOn(context.logger, 'debug');
    const content = { heading: 123 } as unknown as OfferLevelContent;

    expect(resolveContent('heading', offerScope(content), context)).toBeUndefined();
    expect(debugSpy).toHaveBeenCalledWith('resolveContent: unmapped content shape', expect.anything());
  });

  it('substitutes an order_total_price token from its numeric-string extras entry, formatted with TokenInputs.currency', () => {
    const content: OfferLevelContent = {
      positive_cta: 'Pay {order_total_price} now',
      extras: { order_total_price: '196.26' },
    };

    const result = resolveContent('positive_cta', offerScope(content), ctx(), { currency: 'USD' });

    expect(result).toEqual({ kind: 'text', value: 'Pay $196.26 now' });
  });

  it('does not substitute order_total_price without a currency in TokenInputs', () => {
    const content: OfferLevelContent = {
      positive_cta: 'Pay {order_total_price} now',
      extras: { order_total_price: '196.26' },
    };

    const result = resolveContent('positive_cta', offerScope(content), ctx());

    expect(result).toEqual({ kind: 'text', value: 'Pay  now' });
  });

  it('does not substitute order_total_price when the extras entry is not a numeric string', () => {
    const content: OfferLevelContent = {
      positive_cta: 'Pay {order_total_price} now',
      extras: { order_total_price: 'not-a-number' },
    };

    const result = resolveContent('positive_cta', offerScope(content), ctx(), { currency: 'USD' });

    expect(result).toEqual({ kind: 'text', value: 'Pay  now' });
  });

  it('does not substitute order_total_price for an empty or whitespace-only extras entry (never a fabricated 0)', () => {
    const empty: OfferLevelContent = { positive_cta: 'Pay {order_total_price} now', extras: { order_total_price: '' } };
    const blank: OfferLevelContent = {
      positive_cta: 'Pay {order_total_price} now',
      extras: { order_total_price: '   ' },
    };

    expect(resolveContent('positive_cta', offerScope(empty), ctx(), { currency: 'USD' })).toEqual({
      kind: 'text',
      value: 'Pay  now',
    });
    expect(resolveContent('positive_cta', offerScope(blank), ctx(), { currency: 'USD' })).toEqual({
      kind: 'text',
      value: 'Pay  now',
    });
  });

  it('does not substitute order_total_price from a product scope', () => {
    const content = {
      id: 'q1',
      title: 'Pay {order_total_price} now',
      extras: { order_total_price: '196.26' },
    } as unknown as ProductContent;

    const result = resolveContent('title', productScope(content), ctx(), { currency: 'USD' });

    expect(result).toEqual({ kind: 'text', value: 'Pay  now' });
  });

  it('strips and debug-logs an unresolved token', () => {
    const context = ctx(true);
    const debugSpy = vi.spyOn(context.logger, 'debug');
    const content: OfferLevelContent = { heading: 'Total: {unknown_token}' };

    const result = resolveContent('heading', offerScope(content), context);

    expect(result).toEqual({ kind: 'text', value: 'Total: ' });
    expect(debugSpy).toHaveBeenCalledWith(
      'resolveContent: unresolved token',
      expect.objectContaining({ token: 'unknown_token' }),
    );
  });

  it('substitutes every amount in TokenInputs.amounts using the shared currency', () => {
    const content: ProductContent = { id: 'q1', title: 'From {quote_total_price} per traveller' };

    const result = resolveContent('title', productScope(content), ctx(), {
      currency: 'USD',
      amounts: { quote_total_price: 42 },
    });

    expect(result).toEqual({ kind: 'text', value: 'From $42.00 per traveller' });
  });

  it('does not substitute amounts when currency is missing from TokenInputs', () => {
    const content: ProductContent = { id: 'q1', title: 'From {quote_total_price} per traveller' };

    const result = resolveContent('title', productScope(content), ctx(), {
      amounts: { quote_total_price: 42 },
    });

    expect(result).toEqual({ kind: 'text', value: 'From  per traveller' });
  });

  it('does not substitute amounts when amounts is missing from TokenInputs', () => {
    const content: ProductContent = { id: 'q1', title: 'From {quote_total_price} per traveller' };

    const result = resolveContent('title', productScope(content), ctx(), { currency: 'USD' });

    expect(result).toEqual({ kind: 'text', value: 'From  per traveller' });
  });

  it('formats quote_total_price per currency: 0-decimal JPY and 3-decimal KWD, not just 2-decimal USD', () => {
    const content: ProductContent = { id: 'q1', title: '{quote_total_price} per traveller' };

    const jpy = resolveContent('title', productScope(content), ctx(), {
      currency: 'JPY',
      amounts: { quote_total_price: 1000 },
    });
    const kwd = resolveContent('title', productScope(content), ctx(), {
      currency: 'KWD',
      amounts: { quote_total_price: 1.234 },
    });

    expect(jpy).toEqual({ kind: 'text', value: '¥1,000 per traveller' });
    // KWD has no locale symbol, so Intl falls back to the code, joined to the
    // number with a non-breaking space (U+00A0), not a regular space.
    expect(kwd).toEqual({ kind: 'text', value: 'KWD 1.234 per traveller' });
  });

  it('formats order_total_price per currency: 0-decimal JPY, not just 2-decimal USD', () => {
    const content: OfferLevelContent = {
      positive_cta: 'Pay {order_total_price} now',
      extras: { order_total_price: '1000' },
    };

    const result = resolveContent('positive_cta', offerScope(content), ctx(), { currency: 'JPY' });

    expect(result).toEqual({ kind: 'text', value: 'Pay ¥1,000 now' });
  });

  it('formats quote_total_price and order_total_price with the same shared TokenInputs.currency', () => {
    const content: OfferLevelContent = {
      heading: '{quote_total_price} then {order_total_price}',
      extras: { order_total_price: '10' },
    };

    const result = resolveContent('heading', offerScope(content), ctx(), {
      currency: 'USD',
      amounts: { quote_total_price: 5 },
    });

    expect(result).toEqual({ kind: 'text', value: '$5.00 then $10.00' });
  });

  it('accepts a lazy amounts thunk and calls it only once a token is present', () => {
    const amounts = vi.fn(() => ({ quote_total_price: 42 }));
    const content: ProductContent = { id: 'q1', title: 'From {quote_total_price}', description: 'Plain copy' };
    const tokens = { currency: 'USD', amounts };

    expect(resolveContent('title', productScope(content), ctx(), tokens)).toEqual({
      kind: 'text',
      value: 'From $42.00',
    });
    expect(amounts).toHaveBeenCalledTimes(1);

    resolveContent('description', productScope(content), ctx(), tokens);

    expect(amounts).toHaveBeenCalledTimes(1);
  });

  it('treats an undefined-returning amounts thunk as unresolved', () => {
    const content: ProductContent = { id: 'q1', title: 'From {quote_total_price}' };

    const result = resolveContent('title', productScope(content), ctx(), {
      currency: 'USD',
      amounts: () => undefined,
    });

    expect(result).toEqual({ kind: 'text', value: 'From ' });
  });

  it('substitutes tokens in list item text, keeping the item name raw', () => {
    const content: ProductContent = {
      id: 'q1',
      benefits: { medical: 'Covers {quote_total_price} of medical costs' },
    };

    const result = resolveContent('benefits', productScope(content), ctx(), {
      currency: 'USD',
      amounts: { quote_total_price: 100 },
    });

    expect(result).toEqual({
      kind: 'list',
      items: [{ name: 'medical', text: 'Covers $100.00 of medical costs' }],
    });
  });
});
