import type { LayoutNode, SectionName, SelectionNode } from '../layout';
import type { SdkContext } from '../../shared/context';
import type { OfferResponse, Product } from '../../shared/types';
import type { ContentScope, OfferLevelContent, ProductContent } from '../content-types';
import { resolveContent, type TokenInputs } from '../content';
import { groupProducts, sumGroupPremiumAmount, type ProductGroup } from '../aggregation';
import {
  resolveExtras,
  resolvePrice,
  resolveTermsLink,
  resolveLinks,
  resolveTestimonial,
  resolveList,
  resolveSelectionCtaContent,
  resolveTopInfoPanel,
} from './composers';
import {
  routeFor,
  isContentFree,
  type BoundContent,
  type NodeRoute,
  SectionBundle,
  OptionGroupBundle,
} from './routing';

interface Representative {
  group: ProductGroup;
  quote: Product;
  content: ProductContent | undefined;
}

const isNode = (v: unknown): v is LayoutNode =>
  typeof v === 'object' && v !== null && typeof (v as { type?: unknown }).type === 'string';

/**
 * Resolves a section's content nodes (at any depth) to their content, keyed by
 * node name. Nesting is not preserved: the builder owns placement.
 * Product-scope nodes resolve against the section's representative product;
 * absent scope data omits that node rather than throwing.
 */
export function bindSection(
  section: SectionName,
  node: LayoutNode,
  offer: OfferResponse,
  ctx: SdkContext,
  products: Product[] = offer.products,
): SectionBundle {
  const offerContent = offer.content as OfferLevelContent;

  let representative: Representative | undefined,
    representativeResolved = false;

  const getRepresentative = (): Representative | undefined => {
    if (!representativeResolved) {
      representative = resolveRepresentative(
        products,
        offer.content as { products?: ProductContent[] },
        node.aggregate_products === true,
        ctx,
      );

      representativeResolved = true;
    }

    return representative;
  };

  const tokens = makeTokenInputs(offer.currency, getRepresentative, ctx);

  const bound: Record<string, NonNullable<BoundContent>> = {};

  for (const [name, val] of Object.entries(node)) {
    if (name === 'type' || !isNode(val)) continue;

    if (isContentFree(name)) continue;

    if (name === 'opt_in') {
      const groups = bindOptInGroups(val, offer, products, offerContent, node.aggregate_products === true, ctx);

      if (groups.length > 0) {
        bound[name] = { kind: 'bundle_list', groups };
      }

      continue;
    }

    if (name === 'opt_out') {
      const optionBound = bindChildScope(name, val, offerContent, getRepresentative, offer.currency, ctx);

      if (Object.keys(optionBound).length > 0) {
        bound[name] = { kind: 'bundle', entries: optionBound };
      }

      continue;
    }

    const route = routeFor(section, name, String(val.type));

    if (!route) {
      ctx.logger.debug('bindSection: no routing for node', { section, name });

      continue;
    }

    const result = resolveChild(route, val, offerContent, getRepresentative, offer.currency, tokens, ctx);

    if (result !== undefined) {
      bound[name] = result;
    }

    if (isNode(val) && isNode(val.terms_link)) {
      const termsRoute = routeFor(section, 'terms_link');

      if (termsRoute) {
        const termsResult = resolveChild(
          termsRoute,
          val.terms_link,
          offerContent,
          getRepresentative,
          offer.currency,
          tokens,
          ctx,
        );

        if (termsResult !== undefined) {
          bound.terms_link = termsResult;
        }
      }
    }
  }

  return bound;
}

function bindOptInGroups(
  node: LayoutNode,
  offer: OfferResponse,
  products: Product[],
  offerContent: OfferLevelContent,
  aggregate: boolean,
  ctx: SdkContext,
): OptionGroupBundle[] {
  const groups = groupProducts(products ?? [], aggregate);

  const out: OptionGroupBundle[] = [];

  for (const group of groups) {
    const content = offer.content
      ? (offer.content as { products?: ProductContent[] }).products?.find((c) => c.id === group.representative.id)
      : undefined;

    if (content === undefined) {
      ctx.logger.debug('bindSection: no product content joined for opt_in group', { id: group.representative.id });
    }

    const representative: Representative = { group, quote: group.representative, content };

    const entries = bindChildScope('opt_in', node, offerContent, () => representative, offer.currency, ctx);

    out.push({ productIds: group.productIds, entries });
  }

  return out;
}

function bindChildScope(
  scopeName: 'opt_in' | 'opt_out',
  node: LayoutNode,
  offerContent: OfferLevelContent,
  getRepresentative: () => Representative | undefined,
  currency: string,
  ctx: SdkContext,
): SectionBundle {
  const tokens = makeTokenInputs(currency, getRepresentative, ctx);

  const bound: Record<string, NonNullable<BoundContent>> = {};

  for (const [name, val] of Object.entries(node)) {
    if (name === 'type' || !isNode(val)) continue;

    if (isContentFree(name)) continue;

    const route = routeFor(scopeName, name);

    if (!route) {
      ctx.logger.debug('bindSection: no routing for node', { section: scopeName, name });

      continue;
    }

    const result = resolveChild(route, val, offerContent, getRepresentative, currency, tokens, ctx);

    if (result !== undefined) {
      bound[name] = result;
    }
  }

  return bound;
}

function resolveRepresentative(
  products: Product[],
  offerContent: { products?: ProductContent[] },
  aggregate: boolean,
  ctx: SdkContext,
): Representative | undefined {
  const groups = groupProducts(products ?? [], aggregate);

  if (!groups.length) return;

  const group = groups[0];

  const quote = group.representative;

  const content = offerContent.products?.find((c) => c.id === quote.id);

  if (content === undefined) {
    ctx.logger.debug('bindSection: no product content joined for representative', { id: quote.id });
  }

  return { group, quote, content };
}

function makeTokenInputs(
  currency: string,
  getRepresentative: () => Representative | undefined,
  ctx: SdkContext,
): TokenInputs {
  let computed = false;

  let amounts: Record<string, number> | undefined;

  return {
    currency,
    amounts: () => {
      if (!computed) {
        computed = true;

        const representative = getRepresentative();
        const quote_total_price = representative ? sumGroupPremiumAmount(representative.group, ctx) : undefined;

        amounts = quote_total_price === undefined ? undefined : { quote_total_price };
      }

      return amounts;
    },
  };
}

function resolveChild(
  route: NodeRoute,
  node: LayoutNode,
  offerContent: OfferLevelContent,
  getRepresentative: () => Representative | undefined,
  currency: string,
  tokens: TokenInputs,
  ctx: SdkContext,
): BoundContent {
  switch (route.via) {
    case 'list':
      return resolveList(route.field, node, getRepresentative()?.content, offerContent, ctx, tokens);

    case 'extras':
      return resolveExtras(offerContent, route.field, ctx, tokens);

    case 'top_info_panel':
      return resolveTopInfoPanel(offerContent, ctx, tokens);

    case 'price': {
      const representative = getRepresentative();

      return representative ? resolvePrice(representative.group, offerContent, currency, ctx, tokens) : undefined;
    }

    case 'terms_link': {
      const representative = getRepresentative();

      return representative
        ? resolveTermsLink(representative.quote, representative.content, offerContent, ctx, tokens)
        : undefined;
    }

    case 'links': {
      const representative = getRepresentative();

      return representative
        ? resolveLinks(representative.quote, representative.content, offerContent, ctx, tokens)
        : undefined;
    }
    case 'testimonial':
      return resolveTestimonial(offerContent, ctx, tokens);

    case 'selection_cta':
      return (node as SelectionNode).type === 'cta' ? resolveSelectionCtaContent(offerContent, ctx, tokens) : undefined;

    case 'content': {
      if (route.scope === 'offer')
        return resolveContent(route.field, { kind: 'offer', content: offerContent }, ctx, tokens);

      const scope = contentScope(getRepresentative());

      return scope ? resolveContent(route.field, scope, ctx, tokens) : undefined;
    }
  }
}

function contentScope(representative: Representative | undefined): ContentScope | undefined {
  if (representative?.content) return { kind: 'product', content: representative.content };

  return;
}
