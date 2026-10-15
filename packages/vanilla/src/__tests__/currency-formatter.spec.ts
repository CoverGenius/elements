import { describe, expect, it } from 'vitest';
import { formatCurrency } from '../shared/currency-formatter';

describe('formatCurrency', () => {
  it('throws on an invalid currency code', () => {
    expect(() => formatCurrency(123456, 'sdasdasdas')).toThrowError();
  });

  it('returns a string for a valid currency', () => {
    expect(typeof formatCurrency(123456, 'USD')).toBe('string');
  });

  it('uses the correct locale currency symbol', () => {
    expect(formatCurrency(123456, 'USD', { locale: 'en-US' })).toContain('$');
    expect(formatCurrency(123456, 'IDR', { locale: 'id' })).toContain('Rp');
  });

  it('uses the currency code when currencyDisplay is "code"', () => {
    expect(formatCurrency(123456, 'USD', { locale: 'en-US', currencyDisplay: 'code' })).toContain('USD');
    expect(formatCurrency(123456, 'IDR', { locale: 'id', currencyDisplay: 'code' })).toContain('IDR');
  });

  describe('custom marker / template', () => {
    it('returns the default format for an empty template', () => {
      expect(formatCurrency(123456, 'USD', { locale: 'en-US', template: '' })).toBe('$123,456.00');
    });

    it('swaps in a custom marker', () => {
      expect(formatCurrency(123456, 'USD', { locale: 'en-US', marker: '&' })).toBe('&123,456.00');
    });

    it('drops the currency symbol for an explicit empty-string marker', () => {
      // marker: '' is a deliberate "hide the symbol" request, not "no marker
      // given": it must not take the same fast path as an omitted marker,
      // which would fall through to the default locale symbol instead.
      expect(formatCurrency(123456, 'USD', { locale: 'en-US', marker: '' })).toBe('123,456.00');
    });

    it('applies a custom marker and position via template', () => {
      expect(formatCurrency(123456, 'USD', { locale: 'en-US', marker: '&', template: '%v%m' })).toBe('123,456.00&');
    });

    it('supports a custom code marker', () => {
      expect(formatCurrency(123456, 'USD', { locale: 'en-US', currencyDisplay: 'code', marker: 'test' })).toContain(
        'test',
      );
    });

    it('supports a custom code marker with a template position', () => {
      const result = formatCurrency(123456, 'USD', {
        locale: 'en-US',
        currencyDisplay: 'code',
        marker: 'test',
        template: '%v %m',
      });
      expect(result.indexOf('test')).toBeGreaterThan(0);
    });

    it('inserts a marker containing $ patterns literally, not as a replace pattern', () => {
      // '$&' / '$$' are special in String.replace's replacement string; the
      // marker must be inserted verbatim, not interpreted.
      expect(formatCurrency(123456, 'USD', { locale: 'en-US', marker: '$&', template: '%v%m' })).toBe('123,456.00$&');
    });

    it('substitutes every occurrence of a repeated placeholder in the template', () => {
      expect(formatCurrency(123456, 'USD', { locale: 'en-US', marker: '$', template: '%v (%v) %m %m' })).toBe(
        '123,456.00 (123,456.00) $ $',
      );
    });
  });

  it('is pure: repeated calls with different currencies do not interfere', () => {
    const usd = formatCurrency(1000, 'USD', { locale: 'en-US' });
    const eur = formatCurrency(1000, 'EUR', { locale: 'en-US' });
    // Re-run the first; must be identical (the vendored class could drift here).
    expect(formatCurrency(1000, 'USD', { locale: 'en-US' })).toBe(usd);
    expect(usd).not.toBe(eur);
  });
});
