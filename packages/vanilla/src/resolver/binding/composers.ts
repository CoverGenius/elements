import type { SdkContext } from '../../shared/context';
import type { Product } from '../../shared/types';
import type { OfferLevelContent, ProductContent, LinkItem, TestimonialData, ContentScope } from '../content-types';
import type { LayoutNode } from '../layout';
import type { BoundContent, SelectionCTAContent, TopInfoPanelContent } from './routing';
import { sumGroupPremium, type ProductGroup } from '../aggregation';
import { resolveContent, resolveTextTokens, type TokenInputs } from '../content';
import { boundText } from './bound-content';

const pickString = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined);

const getExtra = (offerContent: OfferLevelContent, key: string): string | undefined =>
  pickString(offerContent.extras?.[key]);

const offerScope = (content: OfferLevelContent): ContentScope => ({ kind: 'offer', content });

/** Reads an extras-backed node's value as plain text.  */
export function resolveExtras(
  offerContent: OfferLevelContent,
  key: string,
  ctx: SdkContext,
  tokens?: TokenInputs,
): Extract<BoundContent, { kind: 'text' }> | undefined {
  const value = getExtra(offerContent, key);

  return value ? { kind: 'text', value: resolveTextTokens(value, offerScope(offerContent), ctx, tokens) } : undefined;
}

export function resolveTopInfoPanel(
  offerContent: OfferLevelContent,
  ctx: SdkContext,
  tokens?: TokenInputs,
): TopInfoPanelContent | undefined {
  const message = getExtra(offerContent, 'top_info_panel_message');

  if (!message) return;

  const title = getExtra(offerContent, 'top_info_panel_title');

  const scope = offerScope(offerContent);

  return title
    ? {
        kind: 'top_info_panel',
        title: resolveTextTokens(title, scope, ctx, tokens),
        message: resolveTextTokens(message, scope, ctx, tokens),
      }
    : { kind: 'top_info_panel', message: resolveTextTokens(message, scope, ctx, tokens) };
}

export function resolveList(
  field: string,
  node: LayoutNode,
  representativeContent: ProductContent | undefined,
  offerContent: OfferLevelContent,
  ctx: SdkContext,
  tokens?: TokenInputs,
): Extract<BoundContent, { kind: 'list' }> | undefined {
  if (!representativeContent) return;

  const scope: ContentScope = { kind: 'product', content: representativeContent };

  const resolved = resolveContent(field, scope, ctx, tokens);

  if (!resolved || resolved.kind !== 'list') return;

  const hasHeadingNode = typeof node === 'object' && node !== null && 'heading' in node;

  const heading = hasHeadingNode ? getExtra(offerContent, `${field}_heading`) : undefined;

  return {
    kind: 'list',
    ...(heading ? { heading: resolveTextTokens(heading, offerScope(offerContent), ctx, tokens) } : {}),
    items: resolved.items,
  };
}

/** Formats the group's summed premium plus the price_unit label; omits the node when no usable amount. */
export function resolvePrice(
  group: ProductGroup,
  offerContent: OfferLevelContent,
  currency: string,
  ctx: SdkContext,
  tokens?: TokenInputs,
): Extract<BoundContent, { kind: 'price' }> | undefined {
  const formatted = sumGroupPremium(group, currency, ctx);

  if (formatted === undefined) return;

  const label = pickString(offerContent.price_unit);

  return {
    kind: 'price',
    formatted,
    label: label === undefined ? undefined : resolveTextTokens(label, offerScope(offerContent), ctx, tokens),
  };
}

/** Composes the terms link from the representative quote's pds_url and a label. */
export function resolveTermsLink(
  quote: Product,
  content: ProductContent | undefined,
  offerContent: OfferLevelContent,
  ctx: SdkContext,
  tokens?: TokenInputs,
): Extract<BoundContent, { kind: 'link' }> | undefined {
  const href = quote.details?.pds_url;

  if (typeof href !== 'string' || !href.length) return;

  const productLabel = content ? pickString(content.terms_cta) : undefined;

  if (content && productLabel) {
    return {
      kind: 'link',
      href,
      label: resolveTextTokens(productLabel, { kind: 'product', content }, ctx, tokens),
    };
  }

  const label = getExtra(offerContent, 'terms_cta') ?? 'View terms';

  return { kind: 'link', href, label: resolveTextTokens(label, offerScope(offerContent), ctx, tokens) };
}

export function resolveLinks(
  quote: Product,
  content: ProductContent | undefined,
  offerContent: OfferLevelContent,
  ctx: SdkContext,
  tokens?: TokenInputs,
): Extract<BoundContent, { kind: 'links' }> | undefined {
  const links: LinkItem[] = [];

  const termsLink = resolveTermsLink(quote, content, offerContent, ctx, tokens);

  if (termsLink) {
    links.push({ href: termsLink.href, label: termsLink.label });
  }

  const ipidUrl = getExtra(offerContent, 'ipid_url');

  if (ipidUrl) {
    const ipidLabel = getExtra(offerContent, 'ipid_label') ?? 'IPID';

    links.push({ href: ipidUrl, label: resolveTextTokens(ipidLabel, offerScope(offerContent), ctx, tokens) });
  }

  if (!links.length) return;

  return { kind: 'links', links };
}

export function resolveTestimonial(
  offerContent: OfferLevelContent,
  ctx: SdkContext,
  tokens?: TokenInputs,
): Extract<BoundContent, { kind: 'testimonial' }> | undefined {
  const text = getExtra(offerContent, 'testimonial_text');

  if (!text) return;

  const scope = offerScope(offerContent);

  const substitute = (v: string | undefined) =>
    v === undefined ? undefined : resolveTextTokens(v, scope, ctx, tokens);

  const testimonial: TestimonialData = {
    text: resolveTextTokens(text, scope, ctx, tokens),
    rating: substitute(getExtra(offerContent, 'testimonial_rating')),
    author: substitute(getExtra(offerContent, 'testimonial_author')),
    date: substitute(getExtra(offerContent, 'testimonial_date')),
  };

  return { kind: 'testimonial', testimonial };
}

export function resolveSelectionCtaContent(
  offerContent: OfferLevelContent,
  ctx: SdkContext,
  tokens?: TokenInputs,
): SelectionCTAContent {
  const scope = offerScope(offerContent);

  const positive = resolveContent('positive_cta', scope, ctx, tokens);

  const negative = resolveContent('negative_cta', scope, ctx, tokens);

  return {
    kind: 'selection_cta',
    positiveLabel: boundText(positive) ?? 'Select',
    negativeLabel: boundText(negative) ?? 'No thanks',
    positiveSelectedLabel: resolveExtras(offerContent, 'positive_cta_selected', ctx, tokens)?.value ?? 'Added',
    negativeSelectedLabel:
      resolveExtras(offerContent, 'negative_cta_selected', ctx, tokens)?.value ?? "Don't add protection",
  };
}
