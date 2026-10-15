import { describe, expect, it, vi } from 'vitest';
import { deriveSelectionBehavior, defaultSelectionBehavior, resolveSectionSelection } from '../resolver/selection';
import type { LayoutNode } from '../resolver/layout';
import type { Product, ProductRule, SelectionEvent } from '../shared/types';

function rule(overrides: Partial<ProductRule> = {}): ProductRule {
  return {
    slug: 'protection',
    product_ids: ['q1'],
    initial_state: 'show',
    min_select: 1,
    max_select: 1,
    ...overrides,
  };
}

describe('deriveSelectionBehavior', () => {
  it('returns an empty map when product_rules is undefined', () => {
    expect(deriveSelectionBehavior(undefined).size).toBe(0);
  });

  it('returns an empty map for an empty array', () => {
    expect(deriveSelectionBehavior([]).size).toBe(0);
  });

  it('keys the map by slug', () => {
    const map = deriveSelectionBehavior([rule({ slug: 'cfar' })]);

    expect([...map.keys()]).toEqual(['cfar']);
    expect(map.get('cfar')?.slug).toBe('cfar');
  });

  it('derives radio from max_select 1', () => {
    expect(deriveSelectionBehavior([rule({ max_select: 1 })]).get('protection')?.control).toBe('radio');
  });

  it('derives checkbox from max_select greater than 1', () => {
    expect(deriveSelectionBehavior([rule({ max_select: 3 })]).get('protection')?.control).toBe('checkbox');
  });

  it('marks the group multiple with its cap when max_select is greater than 1', () => {
    const b = deriveSelectionBehavior([rule({ min_select: 0, max_select: 3 })]).get('protection');

    expect([b?.multiple, b?.maxSelect]).toEqual([true, 3]);
  });

  it('keeps the group exclusive (XOR) when max_select is 1, whatever min_select is', () => {
    const b = deriveSelectionBehavior([rule({ min_select: 0, max_select: 1 })]).get('protection');

    expect([b?.multiple, b?.maxSelect, b?.control]).toEqual([false, undefined, 'radio']);
  });

  it('marks the group optional when min_select is 0', () => {
    expect(deriveSelectionBehavior([rule({ min_select: 0 })]).get('protection')?.selectionOptional).toBe(true);
  });

  it('marks the group required when min_select is at least 1', () => {
    expect(deriveSelectionBehavior([rule({ min_select: 1 })]).get('protection')?.selectionOptional).toBe(false);
  });

  it('passes initial_state through unchanged', () => {
    expect(deriveSelectionBehavior([rule({ initial_state: 'hide' })]).get('protection')?.initialState).toBe('hide');
  });

  it('carries the group quote ids on productIds', () => {
    const map = deriveSelectionBehavior([rule({ product_ids: ['q1', 'q2', 'q3'] })]);

    expect(map.get('protection')?.productIds).toEqual(['q1', 'q2', 'q3']);
  });

  it('populates declineEvent from an on:"decline" entry', () => {
    const decline: SelectionEvent = { on: 'decline', action: 'show', target_rule: 'second_chance' };
    const map = deriveSelectionBehavior([rule({ events: [decline] })]);

    expect(map.get('protection')?.declineEvent).toEqual(decline);
  });

  it('leaves declineEvent unset when no decline event is present, even when optional', () => {
    const select: SelectionEvent = { on: 'select', action: 'enable', target_rule: 'other' };
    const map = deriveSelectionBehavior([rule({ min_select: 0, events: [select] })]);

    expect(map.get('protection')?.declineEvent).toBeUndefined();
  });

  it('passes every event through on events', () => {
    const events: SelectionEvent[] = [
      { on: 'select', action: 'enable', target_rule: 'a' },
      { on: 'decline', action: 'show', target_rule: 'b' },
    ];
    const map = deriveSelectionBehavior([rule({ events })]);

    expect(map.get('protection')?.events).toEqual(events);
  });

  it('defaults events to an empty array when omitted', () => {
    expect(deriveSelectionBehavior([rule()]).get('protection')?.events).toEqual([]);
  });

  it('resolves a repeated slug to the last entry', () => {
    const map = deriveSelectionBehavior([rule({ slug: 'dup', max_select: 1 }), rule({ slug: 'dup', max_select: 5 })]);

    expect(map.size).toBe(1);
    expect(map.get('dup')?.control).toBe('checkbox');
    expect(map.get('dup')?.multiple).toBe(true);
  });

  it('copies productIds so mutating the result does not touch the input', () => {
    const input = rule({ product_ids: ['q1', 'q2'] });
    const derived = deriveSelectionBehavior([input]).get('protection')!;

    derived.productIds.push('q3');

    expect(input.product_ids).toEqual(['q1', 'q2']);
  });

  it('copies events so mutating the result does not touch the input', () => {
    const events: SelectionEvent[] = [{ on: 'select', action: 'enable', target_rule: 'a' }];
    const input = rule({ events });
    const derived = deriveSelectionBehavior([input]).get('protection')!;

    derived.events.push({ on: 'decline', action: 'show', target_rule: 'b' });

    expect(input.events).toEqual(events);
  });
});

describe('defaultSelectionBehavior', () => {
  it('is a single-select, optional radio with no reactions', () => {
    const behavior = defaultSelectionBehavior(['q1']);

    expect(behavior.control).toBe('radio');
    expect(behavior.selectionOptional).toBe(true);
    expect(behavior.initialState).toBe('show');
    expect(behavior.declineEvent).toBeUndefined();
    expect(behavior.events).toEqual([]);
  });

  it('carries the passed quote ids', () => {
    expect(defaultSelectionBehavior(['q1', 'q2']).productIds).toEqual(['q1', 'q2']);
  });

  it('defaults productIds to an empty array', () => {
    expect(defaultSelectionBehavior().productIds).toEqual([]);
  });
});

describe('resolveSectionSelection', () => {
  const node = (extra: Partial<LayoutNode> = {}): LayoutNode => ({ type: 'default', ...extra });
  const product = (id: string): Product => ({ id });

  it('returns undefined for non-interactive sections', () => {
    const behaviors = deriveSelectionBehavior([rule()]);

    expect(resolveSectionSelection('header', node({ rule: 'protection' }), behaviors)).toBeUndefined();
  });

  it('matches node.rule against the derived behaviors for input_body', () => {
    const behaviors = deriveSelectionBehavior([rule({ slug: 'protection' })]);

    const sel = resolveSectionSelection('input_body', node({ rule: 'protection' }), behaviors);

    expect(sel?.slug).toBe('protection');
  });

  it('applies the only rule when node.rule is absent', () => {
    const behaviors = deriveSelectionBehavior([rule({ slug: 'only', max_select: 2 })]);

    const sel = resolveSectionSelection('input_body', node(), behaviors, [product('q1')]);

    expect([sel?.slug, sel?.multiple]).toEqual(['only', true]);
  });

  it('falls back to defaultSelectionBehavior when node.rule is absent and several rules exist, without logging', () => {
    const logger = { debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const behaviors = deriveSelectionBehavior([rule(), rule({ slug: 'other' })]);

    const sel = resolveSectionSelection('input_body', node(), behaviors, [product('q1')], logger);

    expect(sel?.slug).toBe('');
    expect(sel?.productIds).toEqual(['q1']);
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it('falls back to defaultSelectionBehavior and debug-logs when node.rule names an unmatched slug', () => {
    const logger = { debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const behaviors = deriveSelectionBehavior([rule({ slug: 'protection' })]);

    const sel = resolveSectionSelection(
      'input_body',
      node({ rule: 'typo-slug' }),
      behaviors,
      [product('q1'), product('q2')],
      logger,
    );

    expect(sel?.slug).toBe('');
    expect(sel?.productIds).toEqual(['q1', 'q2']);
    expect(logger.debug).toHaveBeenCalledWith('resolveSectionSelection: no behavior for rule slug, using default', {
      ruleSlug: 'typo-slug',
    });
  });

  it('does not throw when no logger is passed for an unmatched slug', () => {
    const behaviors = deriveSelectionBehavior([rule({ slug: 'protection' })]);

    expect(() => resolveSectionSelection('input_body', node({ rule: 'typo-slug' }), behaviors)).not.toThrow();
  });
});
