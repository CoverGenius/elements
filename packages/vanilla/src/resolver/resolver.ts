import type { SdkContext } from '../shared/context';
import type { OfferResponse, ErrorEventDetail, PresentationErrorCode } from '../shared/types';
import type { Layout, LayoutNode, SectionName } from './layout';
import { SECTION_ORDER } from './layout';
import { resolveBuilder } from './registry';
import { isSupportedSchemaVersion } from './schema-version';
import { bindSection } from './binding';
import { deriveSelectionBehavior, type SelectionBehavior, resolveSectionSelection } from './selection';

export type ResolveResult = { dom: DocumentFragment } | { error: ErrorEventDetail };

/**
 * Turns an offer response into panel DOM, or an error to surface.
 * Empty or missing presentation and an unsupported `schema_version` return an error;
 * anything else renderable degrades in place rather than failing.
 */
export function resolvePresentation(offer: OfferResponse, ctx: SdkContext, doc: Document = document): ResolveResult {
  const { presentation } = offer;

  if (!presentation || Object.keys(presentation).length === 0) {
    return errorResult('presentation_empty', 'Offer response has no presentation to render.', ctx);
  }

  if (!('schema_version' in presentation) || presentation.schema_version === undefined) {
    return errorResult('presentation_malformed', 'Presentation is missing schema_version.', ctx);
  }

  if (!isSupportedSchemaVersion(presentation.schema_version)) {
    return errorResult(
      'schema_version_unsupported',
      `Unsupported presentation schema_version: ${String(presentation.schema_version)}.`,
      ctx,
    );
  }

  const layout = presentation.layout as Layout;

  if (!layout || typeof layout !== 'object') {
    return errorResult('presentation_malformed', 'Presentation has no layout to render.', ctx);
  }

  const behaviors = deriveSelectionBehavior(offer.product_rules);

  const dom = doc.createDocumentFragment();

  for (const section of SECTION_ORDER) {
    const node = layout[section];

    if (!node) continue;

    const el = buildNode(section, node, offer, ctx, doc, behaviors);

    if (el) dom.appendChild(el);
  }

  if (!dom.hasChildNodes()) {
    return errorResult('presentation_empty', 'Presentation produced no renderable sections.', ctx);
  }

  return { dom };
}

function buildNode(
  kind: SectionName,
  node: LayoutNode,
  offer: OfferResponse,
  ctx: SdkContext,
  doc: Document,
  behaviors: Map<string, SelectionBehavior>,
): HTMLElement | null {
  const builder = resolveBuilder(kind, node.type, ctx.logger);

  if (!builder) return null;

  const selection = resolveSectionSelection(kind, node, behaviors, offer.products, ctx.logger);

  const products = selection?.slug ? offer.products.filter((p) => selection.productIds.includes(p.id)) : offer.products;

  const content = bindSection(kind, node, offer, ctx, products);

  const theme = offer.presentation?.theme;

  return builder({ node, content, selection, ctx, doc, products, theme });
}

function errorResult(code: PresentationErrorCode, message: string, ctx: SdkContext): { error: ErrorEventDetail } {
  ctx.logger.debug('presentation resolve error', { code, message });

  return { error: { code, message } };
}
