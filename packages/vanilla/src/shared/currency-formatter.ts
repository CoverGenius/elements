const TEMPLATE_VALUE = '%v';
const TEMPLATE_MARKER = '%m';

export interface CurrencyFormatOptions {
  locale?: string;
  currencyDisplay?: 'symbol' | 'code' | 'name';
  marker?: string;
  template?: string;
  intl?: Intl.NumberFormatOptions;
}

/**
 * Formats `amount` in `currency`. Pure: no shared/mutated state, safe to call
 * with any currency. `marker`/`template` are optional custom presentation.
 */
export function formatCurrency(amount: number, currency: string, opts: CurrencyFormatOptions = {}): string {
  const { locale = 'en-US', currencyDisplay = 'symbol', marker, template, intl } = opts;

  const parts = new Intl.NumberFormat(locale, {
    ...intl,
    style: 'currency',
    currency,
    currencyDisplay,
  }).formatToParts(amount);

  if (marker === undefined && !template) return parts.map((p) => p.value).join('');

  const resolvedMarker = marker ?? parts.find((p) => p.type === 'currency')?.value ?? '';

  const numbers = parts
    .filter((p) => p.type !== 'currency')
    .map((p) => p.value)
    .join('')
    .trim();

  // Requires %v; a marker-only template has no value slot and uses the default shape.
  if (template?.includes(TEMPLATE_VALUE)) {
    // Function replacers so a `$` in the number or marker (for example a custom
    // marker or a currency symbol) is inserted literally, not read as a
    // String.replace pattern ($$, $&, $1, ...).
    return template.replaceAll(TEMPLATE_VALUE, () => numbers).replaceAll(TEMPLATE_MARKER, () => resolvedMarker);
  }

  return parts.map((p) => (p.type === 'currency' ? resolvedMarker : p.value)).join('');
}
