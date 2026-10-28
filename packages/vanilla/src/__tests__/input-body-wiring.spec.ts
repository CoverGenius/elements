import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { resolvePresentation } from '../resolver/resolver';
import { registerBuilder, clearBuilders } from '../resolver/registry';
import { resolveContext } from '../shared/context';
import { SECTION_ORDER } from '../resolver/layout';
import { CG_DATASET, CG_ROLE } from '../shared/attributes';
import type { BuildArgs, NodeBuilder } from '../resolver/builder';
import type { OfferResponse, Product, ProductRule } from '../shared/types';

const ctx = () => resolveContext({ environment: 'sandbox', debug: true });

let capturedArgs: Record<string, BuildArgs> = {};

function capturingBuilder(kind: string): NodeBuilder {
  return (args: BuildArgs) => {
    capturedArgs[kind] = args;
    const el = args.doc.createElement('div');
    el.dataset[CG_DATASET.node] = kind;
    el.dataset[CG_DATASET.type] = args.node.type;

    if (kind === 'input_body') {
      const prods = args.products ?? [];
      for (const p of prods) {
        const opt = args.doc.createElement('label');
        opt.dataset[CG_DATASET.role] = CG_ROLE.option;
        opt.dataset[CG_DATASET.productIds] = p.id;
        const ctrl = args.doc.createElement('input');
        ctrl.type = args.selection?.control ?? 'radio';
        ctrl.dataset[CG_DATASET.role] = CG_ROLE.selectionControl;
        opt.append(ctrl);
        el.append(opt);
      }
      if (args.node.opt_out) {
        const dec = args.doc.createElement('button');
        dec.dataset[CG_DATASET.role] = CG_ROLE.decline;
        el.append(dec);
      }
    }

    return el;
  };
}

function quote(id: string, configId?: string, amount?: number): Product {
  const details: Record<string, unknown> = {};
  if (amount !== undefined) details.finance = { price: { total_amount: amount } };
  return {
    id,
    ...(configId ? { product_config_id: configId } : {}),
    ...(Object.keys(details).length ? { details: details as Product['details'] } : {}),
  };
}

function offer(
  layout: unknown,
  products: Product[] = [],
  productRules?: ProductRule[],
  content: Record<string, unknown> = {},
): OfferResponse {
  return {
    id: 'o1',
    offer_config_id: 'oc1',
    offer_schema: 'schema-1',
    currency: 'USD',
    products,
    product_rules: productRules,
    content,
    presentation: { schema_version: '1.0', ref: 'r1', theme: {}, layout },
  } as OfferResponse;
}

describe('input_body section walk & discovery', () => {
  beforeEach(() => {
    capturedArgs = {};
    for (const kind of SECTION_ORDER) {
      registerBuilder(kind, 'default', capturingBuilder(kind));
    }
  });

  afterEach(() => clearBuilders());

  describe('discovery and invocation', () => {
    it('discovers and invokes input_body builder with BuildArgs', () => {
      const layout = {
        input_body: {
          type: 'default',
          selection: { type: 'default' },
          opt_in: { type: 'default', heading: { type: 'default' } },
        },
      };
      const products = [quote('q1', 'c1', 25)];
      const content = { products: [{ id: 'q1', title: 'Standard Protection' }] };

      const result = resolvePresentation(offer(layout, products, undefined, content), ctx());

      expect('dom' in result).toBe(true);
      expect(capturedArgs.input_body).toBeDefined();
      expect(capturedArgs.input_body.node.type).toBe('default');
      expect(capturedArgs.input_body.products).toEqual(products);
    });

    it('passes resolved content bundle to input_body builder', () => {
      const layout = {
        input_body: {
          type: 'default',
          opt_in: {
            type: 'card',
            heading: { type: 'default' },
            badge: { type: 'default' },
          },
        },
      };
      const products = [quote('q1')];
      const content = {
        products: [{ id: 'q1', title: 'Comprehensive Plan', credibility_badge: 'Best Value' }],
      };

      resolvePresentation(offer(layout, products, undefined, content), ctx());

      const contentBundle = capturedArgs.input_body?.content;
      expect(contentBundle).toBeDefined();
      const optInBundle = contentBundle?.opt_in;
      const optIn = optInBundle?.kind === 'bundle_list' ? optInBundle.groups[0].entries : {};
      expect(optIn.heading).toEqual({ kind: 'text', value: 'Comprehensive Plan' });
      expect(optIn.badge).toEqual({ kind: 'text', value: 'Best Value' });
    });
  });

  describe('selection behaviour threading from product_rules', () => {
    it('threads default SelectionBehavior (radio, optional) when product_rules is omitted', () => {
      const layout = { input_body: { type: 'default', opt_in: { type: 'default' } } };
      const products = [quote('q1'), quote('q2')];

      resolvePresentation(offer(layout, products), ctx());

      const sel = capturedArgs.input_body?.selection;
      expect(sel).toBeDefined();
      expect(sel?.control).toBe('radio');
      expect(sel?.selectionOptional).toBe(true);
      expect(sel?.productIds).toEqual(['q1', 'q2']);
    });

    it('threads derived SelectionBehavior when product_rules specifies multi-select (checkbox)', () => {
      const layout = {
        input_body: {
          type: 'default',
          rule: 'rule-multi',
          opt_in: { type: 'default' },
        },
      };
      const products = [quote('q1'), quote('q2')];
      const rules: ProductRule[] = [
        {
          slug: 'rule-multi',
          product_ids: ['q1', 'q2'],
          initial_state: 'show',
          min_select: 1,
          max_select: 2,
        },
      ];

      resolvePresentation(offer(layout, products, rules), ctx());

      const sel = capturedArgs.input_body?.selection;
      expect(sel).toBeDefined();
      expect(sel?.control).toBe('checkbox');
      expect(sel?.selectionOptional).toBe(false);
      expect(sel?.slug).toBe('rule-multi');
    });

    it("applies the offer's only product_rule to input_body when the layout names no rule", () => {
      const layout = { input_body: { type: 'default', opt_in: { type: 'default' } } };
      const rules: ProductRule[] = [
        { slug: 'multi', product_ids: ['q1', 'q2'], initial_state: 'show', min_select: 0, max_select: 2 },
      ];

      resolvePresentation(offer(layout, [quote('q1'), quote('q2')], rules), ctx());

      const sel = capturedArgs.input_body?.selection;
      expect([sel?.slug, sel?.control, sel?.multiple]).toEqual(['multi', 'checkbox', true]);
    });

    it('scopes products passed to builder when rule covers a subset of offer products', () => {
      const layout = {
        input_body: {
          type: 'default',
          rule: 'rule-subset',
          opt_in: { type: 'default' },
        },
      };
      const products = [quote('q1'), quote('q2'), quote('q3')];
      const rules: ProductRule[] = [
        {
          slug: 'rule-subset',
          product_ids: ['q1', 'q3'],
          initial_state: 'show',
          min_select: 1,
          max_select: 2,
        },
      ];

      resolvePresentation(offer(layout, products, rules), ctx());

      expect(capturedArgs.input_body?.products).toEqual([quote('q1'), quote('q3')]);
    });

    it('scopes to zero products when a matched rule declares an empty product_ids', () => {
      const layout = {
        input_body: {
          type: 'default',
          rule: 'rule-empty',
          opt_in: { type: 'default' },
        },
      };
      const products = [quote('q1'), quote('q2')];
      const rules: ProductRule[] = [
        {
          slug: 'rule-empty',
          product_ids: [],
          initial_state: 'show',
          min_select: 0,
          max_select: 1,
        },
      ];

      resolvePresentation(offer(layout, products, rules), ctx());

      expect(capturedArgs.input_body?.products).toEqual([]);
    });

    it('falls back to every offer product when no rule matches (undefined selection.slug)', () => {
      const layout = { input_body: { type: 'default', opt_in: { type: 'default' } } };
      const products = [quote('q1'), quote('q2')];

      resolvePresentation(offer(layout, products), ctx());

      expect(capturedArgs.input_body?.products).toEqual(products);
    });

    it('debug-logs when node.rule names a slug absent from the derived behaviors, and falls back to default', () => {
      const c = ctx();
      const debug = vi.spyOn(c.logger, 'debug');
      const layout = {
        input_body: {
          type: 'default',
          rule: 'rule-typo',
          opt_in: { type: 'default' },
        },
      };
      const products = [quote('q1'), quote('q2')];
      const rules: ProductRule[] = [
        {
          slug: 'rule-real',
          product_ids: ['q1'],
          initial_state: 'show',
          min_select: 1,
          max_select: 1,
        },
      ];

      resolvePresentation(offer(layout, products, rules), c);

      expect(debug).toHaveBeenCalledWith('resolveSectionSelection: no behavior for rule slug, using default', {
        ruleSlug: 'rule-typo',
      });
      const sel = capturedArgs.input_body?.selection;
      expect(sel?.slug).toBe('');
      expect(sel?.productIds).toEqual(['q1', 'q2']);
      expect(capturedArgs.input_body?.products).toEqual(products);
    });

    it('threads decline reactions on SelectionBehavior', () => {
      const layout = {
        input_body: {
          type: 'default',
          rule: 'rule-opt',
          opt_in: { type: 'default' },
          opt_out: { type: 'default' },
        },
      };
      const products = [quote('q1')];
      const rules: ProductRule[] = [
        {
          slug: 'rule-opt',
          product_ids: ['q1'],
          initial_state: 'show',
          min_select: 0,
          max_select: 1,
          events: [{ on: 'decline', action: 'show', target_rule: 'second-chance-group' }],
        },
      ];

      resolvePresentation(offer(layout, products, rules), ctx());

      const sel = capturedArgs.input_body?.selection;
      expect(sel).toBeDefined();
      expect(sel?.declineEvent).toEqual({
        on: 'decline',
        action: 'show',
        target_rule: 'second-chance-group',
      });
    });
  });

  describe('worked examples round-trip (default input_body)', () => {
    it('round-trips worked example 1: standard single-quote card', () => {
      const layout = {
        header: { type: 'default', heading: { type: 'default' } },
        input_body: {
          type: 'default',
          selection: { type: 'default' },
          opt_in: { type: 'default', heading: { type: 'default' }, price: { type: 'default' } },
          opt_out: { type: 'default', heading: { type: 'default' } },
        },
        footer: { type: 'default', disclaimer: { type: 'html' } },
      };
      const products = [quote('q1', 'c1', 19.99)];
      const content = {
        heading: 'Protect your purchase',
        products: [{ id: 'q1', title: 'Damage Protection' }],
      };

      const result = resolvePresentation(offer(layout, products, undefined, content), ctx());

      if (!('dom' in result)) throw new Error('expected dom');
      const inputBodyEl = result.dom.querySelector(`[data-cg-node="input_body"]`) as HTMLElement;
      expect(inputBodyEl).toBeDefined();
      expect(inputBodyEl.querySelectorAll(`[data-cg-role="option"]`).length).toBe(1);
      expect(inputBodyEl.querySelector(`[data-cg-role="decline"]`)).toBeDefined();
    });

    it('round-trips worked example 3: multi-product cards', () => {
      const layout = {
        input_body: {
          type: 'default',
          opt_in: { type: 'card', heading: { type: 'default' } },
          opt_out: { type: 'default', heading: { type: 'default' } },
        },
      };
      const products = [quote('q1', 'c1', 10), quote('q2', 'c2', 20), quote('q3', 'c3', 30)];

      const result = resolvePresentation(offer(layout, products), ctx());

      if (!('dom' in result)) throw new Error('expected dom');
      const inputBodyEl = result.dom.querySelector(`[data-cg-node="input_body"]`) as HTMLElement;
      expect(inputBodyEl.querySelectorAll(`[data-cg-role="option"]`).length).toBe(3);
    });
  });
});
