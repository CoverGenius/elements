import type { LayoutNode, SectionName } from './layout';
import type { Product, ProductRule, SelectionEvent } from '../shared/types';
import type { Logger } from '../shared/context';

/**
 * The selection behaviour for one option group.
 * `productIds` are the quote ids the option represents (more than one when a group
 * is aggregated into a single option).
 * `multiple` is true when the rule allows more than one option selected at once
 * (`max_select > 1`); `maxSelect` then caps how many. Otherwise the group is exclusive.
 * `declineEvent` is present only when the group carries an `on: 'decline'` reaction,
 * and is independent of `selectionOptional`: an optional group need not offer a decline,
 * and a required one may.
 */
export interface SelectionBehavior {
  slug: string;
  productIds: string[];
  control: 'radio' | 'checkbox';
  multiple: boolean;
  maxSelect?: number;
  selectionOptional: boolean;
  initialState: 'show' | 'hide' | 'disable';
  declineEvent?: SelectionEvent;
  events: SelectionEvent[];
}

/**
 * Behaviour for a group with no matching rule: a single-select, optional radio
 * with no reactions. `productIds` are the option's own quote ids.
 */
export function defaultSelectionBehavior(productIds: string[] = []): SelectionBehavior {
  return {
    slug: '',
    productIds,
    control: 'radio',
    multiple: false,
    selectionOptional: true,
    initialState: 'show',
    events: [],
  };
}

/**
 * Derives a `SelectionBehavior` per group from `product_rules`, keyed by slug.
 * Absent rules yield an empty map; look a missing group up against
 * `defaultSelectionBehavior`. Repeated slugs resolve to the last entry.
 * The `productIds` and `events` arrays are copies, not references into the
 * input, so mutating them does not affect the offer response.
 */
export function deriveSelectionBehavior(productRules: ProductRule[] | undefined): Map<string, SelectionBehavior> {
  const behaviors = new Map<string, SelectionBehavior>();

  if (!productRules) return behaviors;

  for (const rule of productRules) {
    const events = rule.events ? [...rule.events] : [];

    const multiple = rule.max_select > 1;

    behaviors.set(rule.slug, {
      slug: rule.slug,
      productIds: [...rule.product_ids],
      control: multiple ? 'checkbox' : 'radio',
      multiple,
      maxSelect: multiple ? rule.max_select : undefined,
      selectionOptional: rule.min_select === 0,
      initialState: rule.initial_state,
      declineEvent: events.find((e) => e.on === 'decline'),
      events,
    });
  }

  return behaviors;
}

/**
 * Resolves the SelectionBehavior for a section:
 * - Returns undefined for non-interactive sections (header, top_body, bottom_body, footer).
 * - For input_body, matches by node.rule slug againts derived behaviors. When the node names
 *   no rule and the offer carries exactly one, that rule applies to the section.
 * - Falls back to defaultSelectionBehavior using the offer's quote IDs.
 */
export function resolveSectionSelection(
  kind: SectionName,
  node: LayoutNode,
  behaviors: Map<string, SelectionBehavior>,
  products: Product[] = [],
  logger?: Logger,
): SelectionBehavior | undefined {
  if (kind !== 'input_body') return;

  const ruleSlug = typeof node.rule === 'string' ? node.rule : undefined;

  if (!ruleSlug && behaviors.size === 1) return behaviors.values().next().value;

  if (ruleSlug) {
    const matched = behaviors.get(ruleSlug);

    if (matched) return matched;

    logger?.debug('resolveSectionSelection: no behavior for rule slug, using default', { ruleSlug });
  }

  const productIds = products.map((p) => p.id);

  return defaultSelectionBehavior(productIds);
}
