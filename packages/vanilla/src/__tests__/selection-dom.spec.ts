import { describe, expect, it } from 'vitest';
import { matchesOption, parseProductIds } from '../core/selection-dom';

describe('parseProductIds', () => {
  it('returns an empty array for a null attribute', () => {
    expect(parseProductIds(null)).toEqual([]);
  });

  it('splits a space-separated id list', () => {
    expect(parseProductIds('q1 q2 q3')).toEqual(['q1', 'q2', 'q3']);
  });

  it('drops empty entries from padded or repeated whitespace', () => {
    expect(parseProductIds('  q1   q2  ')).toEqual(['q1', 'q2']);
  });
});

describe('matchesOption', () => {
  function el(attrs: Record<string, string>): HTMLElement {
    const node = document.createElement('div');
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  }

  it('matches an explicit data-cg-option-id', () => {
    expect(matchesOption(el({ 'data-cg-option-id': 'plan-a' }), 'plan-a')).toBe(true);
  });

  it('does not match on product id membership: the option id is the only identity', () => {
    expect(matchesOption(el({ 'data-cg-product-ids': 'q1 q2' }), 'q2')).toBe(false);
  });

  it('does not match a whitespace artefact from a padded id list', () => {
    expect(matchesOption(el({ 'data-cg-product-ids': ' q1 ' }), '')).toBe(false);
  });

  it('does not match an unrelated id', () => {
    expect(matchesOption(el({ 'data-cg-product-ids': 'q1' }), 'q9')).toBe(false);
  });
});
