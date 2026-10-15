import { describe, expect, it } from 'vitest';
import { buildPrice } from '../components/price';
import { COMPONENT_STYLES } from '../styles/generated/component-styles.generated';

describe('buildPrice', () => {
  it('renders a formatted price string with default type', () => {
    const el = buildPrice({ formatted: '$12.99' });

    expect(el.tagName).toBe('DIV');
    expect(el.className).toContain('cge-price');
    expect(el.className).toContain('cge-price-default');
    const amount = el.querySelector('.cge-price-amount')!;
    expect(amount.textContent).toBe('$12.99');
  });

  it('has no inline styles on amount (styles live in the adopted stylesheet)', () => {
    const el = buildPrice({ formatted: '$5.00' });
    const amount = el.querySelector('.cge-price-amount') as HTMLElement;

    expect(amount.style.length).toBe(0);
  });

  it('stylesheet defines --cge-price-* variables', () => {
    expect(COMPONENT_STYLES).toContain('--cge-price-font-size');
    expect(COMPONENT_STYLES).toContain('--cge-price-font-weight');
    expect(COMPONENT_STYLES).toContain('--cge-price-label-color');
  });

  it('displays the pre-formatted string as-is (no number formatting)', () => {
    const el = buildPrice({ formatted: 'KWD 1.500' });
    const amount = el.querySelector('.cge-price-amount')!;

    expect(amount.textContent).toBe('KWD 1.500');
  });

  it('renders a label when provided', () => {
    const el = buildPrice({ formatted: '$12.99', label: 'Incl. GST' });
    const sub = el.querySelector('.cge-price-label') as HTMLElement;

    expect(sub).not.toBeNull();
    expect(sub.textContent).toBe('Incl. GST');
    expect(sub.className).toBe('cge-price-label');
  });

  it('omits label element when label is not provided', () => {
    const el = buildPrice({ formatted: '$12.99' });

    expect(el.querySelector('.cge-price-label')).toBeNull();
  });

  it('applies block type class for card layouts', () => {
    const el = buildPrice({ formatted: '$29.00', type: 'block' });

    expect(el.className).toContain('cge-price-block');
  });

  it('applies default type class for row layouts', () => {
    const el = buildPrice({ formatted: '$5.00', type: 'default' });

    expect(el.className).toContain('cge-price-default');
  });

  it('applies the configured display location class', () => {
    const inlineEnd = buildPrice({ formatted: '$5.00', location: 'inline_end' });
    const below = buildPrice({ formatted: '$5.00', location: 'below' });

    expect(inlineEnd.className).toContain('cge-price-inline-end');
    expect(below.className).toContain('cge-price-below');
  });

  it('styles inline-end prices at the trailing edge of the option header', () => {
    expect(COMPONENT_STYLES).toContain('.cge-price-inline-end');
  });
});
