import type { SdkContext } from '../shared/context';
import { reconstructDisclaimer } from './disclaimer';
import { resolveTokens } from './tokens';
import type { ContentScope, ResolvedContent, ResolvedListItem } from './content-types';

const LIST_FIELDS = new Set(['benefits', 'inclusions', 'exclusions']);

// Maps a node kind to the wire field it actually reads: `disclaimer` on the
// wire is plain text, `disclaimer_html` carries the markup to reconstruct.
const RICH_TEXT_FIELDS: Record<string, string> = { disclaimer_html: 'disclaimer_html' };

export interface TokenInputs {
  currency?: string;
  amounts?: Record<string, number> | (() => Record<string, number> | undefined);
}

/**
 * Resolves one node's content from its scope. `nodePath` is the field key
 * into the scope's flat content dict; there is no nesting to walk, offer-
 * and product-level content are both flat.
 */
export function resolveContent(
  nodePath: string,
  scope: ContentScope,
  ctx: SdkContext,
  tokens?: TokenInputs,
): ResolvedContent {
  const richTextField = RICH_TEXT_FIELDS[nodePath];

  if (richTextField) {
    const html = scope.content[richTextField];

    if (typeof html !== 'string') {
      ctx.logger.debug('resolveContent: no content for node', { nodePath, scope: scope.kind });

      return;
    }

    return { kind: 'richText', nodes: reconstructDisclaimer(html, ctx.logger) };
  }

  const raw = scope.content[nodePath];

  if (raw === undefined) {
    ctx.logger.debug('resolveContent: no content for node', { nodePath, scope: scope.kind });

    return;
  }

  if (LIST_FIELDS.has(nodePath)) {
    return resolveList(raw, scope, ctx, tokens);
  }

  if (typeof raw === 'string') {
    return { kind: 'text', value: resolveTextTokens(raw, scope, ctx, tokens) };
  }

  ctx.logger.debug('resolveContent: unmapped content shape', { nodePath, scope: scope.kind });

  return;
}

function resolveList(raw: unknown, scope: ContentScope, ctx: SdkContext, tokens?: TokenInputs): ResolvedContent {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    ctx.logger.debug('resolveContent: list field is not an object', { raw });

    return;
  }

  const items: ResolvedListItem[] = Object.entries(raw as Record<string, string>).map(([name, text]) => ({
    name,
    text: typeof text === 'string' ? resolveTextTokens(text, scope, ctx, tokens) : text,
  }));

  return { kind: 'list', items };
}

export function resolveTextTokens(raw: string, scope: ContentScope, ctx: SdkContext, tokens?: TokenInputs): string {
  if (!raw.includes('{')) return raw;

  const values = tokenValues(scope, ctx, tokens);

  return resolveTokens(raw, values, (token) => {
    ctx.logger.debug('resolveContent: unresolved token', { token, scope: scope.kind });
  });
}

function tokenValues(scope: ContentScope, ctx: SdkContext, tokens?: TokenInputs): Record<string, string> {
  const values: Record<string, string> = {};

  const amounts = typeof tokens?.amounts === 'function' ? tokens.amounts() : tokens?.amounts;

  if (amounts && tokens?.currency) {
    for (const [name, amount] of Object.entries(amounts)) {
      values[name] = ctx.currency.format(amount, tokens.currency);
    }
  }

  if (scope.kind === 'offer' && tokens?.currency) {
    const raw = scope.content.extras?.order_total_price;

    const trimmed = typeof raw === 'string' ? raw.trim() : '';

    const amount = trimmed ? Number(trimmed) : undefined;

    if (amount !== undefined && !Number.isNaN(amount)) {
      values.order_total_price = ctx.currency.format(amount, tokens.currency);
    }
  }

  return values;
}
