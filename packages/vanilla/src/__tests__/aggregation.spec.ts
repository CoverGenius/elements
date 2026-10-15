import { describe, expect, it, vi } from 'vitest';
import { resolveContext } from '../shared/context';
import { groupProducts, sumGroupPremium, sumGroupPremiumAmount, type ProductGroup } from '../resolver/aggregation';
import type { Product } from '../shared/types';

function ctx(debug = false) {
  return resolveContext({ environment: 'sandbox', debug });
}

function product(id: string, configId?: string, amount?: number): Product {
  const p: Product = { id };

  if (configId !== undefined) p.product_config_id = configId;

  if (amount !== undefined) {
    p.details = {
      finance: {
        price: {
          total_amount: amount,
          total_amount_formatted: null,
          total_amount_without_tax: null,
          total_amount_without_tax_formatted: null,
          total_amount_min: null,
          total_amount_min_formatted: null,
          total_amount_max: null,
          total_amount_max_formatted: null,
        },
      },
    };
  }

  return p;
}

describe('groupProducts', () => {
  it('gives each product its own option when aggregate is off', () => {
    const products = [product('q1', 'c1'), product('q2', 'c1'), product('q3', 'c2')];

    const groups = groupProducts(products, false);

    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.productIds)).toEqual([['q1'], ['q2'], ['q3']]);
  });

  it('does not group same-config products when aggregate is off', () => {
    const products = [product('q1', 'c1'), product('q2', 'c1')];

    expect(groupProducts(products, false)).toHaveLength(2);
  });

  it('collapses same-config products into one option when aggregate is on', () => {
    const products = [product('q1', 'c1'), product('q2', 'c1'), product('q3', 'c2')];

    const groups = groupProducts(products, true);

    expect(groups).toHaveLength(2);
    expect(groups[0].productIds).toEqual(['q1', 'q2']);
    expect(groups[1].productIds).toEqual(['q3']);
  });

  it('retains every group quote id in offer order', () => {
    const products = [product('q1', 'c1'), product('q2', 'c2'), product('q3', 'c1')];

    const groups = groupProducts(products, true);

    // c1 keeps q1 then q3 (offer order), not grouped-adjacent order.
    expect(groups[0].productIds).toEqual(['q1', 'q3']);
    expect(groups[1].productIds).toEqual(['q2']);
  });

  it('preserves first-seen order of the groups themselves', () => {
    const products = [product('q1', 'c2'), product('q2', 'c1'), product('q3', 'c2')];

    const groups = groupProducts(products, true);

    expect(groups.map((g) => g.representative.id)).toEqual(['q1', 'q2']);
  });

  it('picks the first member of each group as the representative (first-wins)', () => {
    const products = [product('q1', 'c1'), product('q2', 'c1')];

    const groups = groupProducts(products, true);

    expect(groups[0].representative).toBe(products[0]);
  });

  it('keeps a product with no product_config_id as its own option under aggregate', () => {
    const products = [product('q1'), product('q2'), product('q3', 'c1')];

    const groups = groupProducts(products, true);

    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.productIds)).toEqual([['q1'], ['q2'], ['q3']]);
  });

  it('does not collapse config-less products together', () => {
    const products = [product('q1'), product('q2')];

    const groups = groupProducts(products, true);

    expect(groups).toHaveLength(2);
  });

  it('returns an empty array for no products', () => {
    expect(groupProducts([], true)).toEqual([]);
    expect(groupProducts([], false)).toEqual([]);
  });

  it('carries all members on the group', () => {
    const products = [product('q1', 'c1'), product('q2', 'c1')];

    const groups = groupProducts(products, true);

    expect(groups[0].members).toEqual(products);
  });
});

describe('sumGroupPremium', () => {
  function group(members: Product[]): ProductGroup {
    return { productIds: members.map((m) => m.id), representative: members[0], members };
  }

  it('sums raw major-unit amounts and formats the total once', () => {
    const g = group([product('q1', 'c1', 12.5), product('q2', 'c1', 7.25)]);

    expect(sumGroupPremium(g, 'USD', ctx())).toBe('$19.75');
  });

  it('formats the total in the response currency', () => {
    const g = group([product('q1', 'c1', 10), product('q2', 'c1', 5)]);

    // EUR symbol, en-US locale default from resolveContext.
    expect(sumGroupPremium(g, 'EUR', ctx())).toBe('€15.00');
  });

  it('formats a single-member group', () => {
    const g = group([product('q1', 'c1', 42)]);

    expect(sumGroupPremium(g, 'USD', ctx())).toBe('$42.00');
  });

  it('formats a genuine zero total', () => {
    const g = group([product('q1', 'c1', 0)]);

    expect(sumGroupPremium(g, 'USD', ctx())).toBe('$0.00');
  });

  it('skips a member with a missing amount and sums the rest', () => {
    const g = group([product('q1', 'c1', 10), product('q2', 'c1')]);

    expect(sumGroupPremium(g, 'USD', ctx())).toBe('$10.00');
  });

  it('skips a non-finite amount', () => {
    const g = group([product('q1', 'c1', 10), product('q2', 'c1', Number.NaN)]);

    expect(sumGroupPremium(g, 'USD', ctx())).toBe('$10.00');
  });

  it('returns undefined when no member has a usable amount', () => {
    const g = group([product('q1', 'c1'), product('q2', 'c1')]);

    expect(sumGroupPremium(g, 'USD', ctx())).toBeUndefined();
  });

  it('debug-logs each skipped member', () => {
    const context = ctx(true);
    const debugSpy = vi.spyOn(context.logger, 'debug');
    const g = group([product('q1', 'c1'), product('q2', 'c1', 5)]);

    sumGroupPremium(g, 'USD', context);

    expect(debugSpy).toHaveBeenCalledWith('sumGroupPremium: missing or non-numeric total_amount', { id: 'q1' });
  });
});

describe('sumGroupPremiumAmount', () => {
  function group(members: Product[]): ProductGroup {
    return { productIds: members.map((m) => m.id), representative: members[0], members };
  }

  it('returns the raw summed major-unit amount, unformatted', () => {
    const g = group([product('q1', 'c1', 12.5), product('q2', 'c1', 7.25)]);

    expect(sumGroupPremiumAmount(g, ctx())).toBe(19.75);
  });

  it('returns a genuine zero total', () => {
    expect(sumGroupPremiumAmount(group([product('q1', 'c1', 0)]), ctx())).toBe(0);
  });

  it('skips members with missing or non-finite amounts', () => {
    const g = group([product('q1', 'c1', 10), product('q2', 'c1'), product('q3', 'c1', Number.NaN)]);

    expect(sumGroupPremiumAmount(g, ctx())).toBe(10);
  });

  it('returns undefined when no member has a usable amount', () => {
    expect(sumGroupPremiumAmount(group([product('q1', 'c1')]), ctx())).toBeUndefined();
  });
});
