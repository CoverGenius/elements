import { describe, expect, it } from 'vitest';
import { buildSelectionControl } from '../components/selection-control';
import { COMPONENT_STYLES } from '../styles/generated/component-styles.generated';

describe('buildSelectionControl', () => {
  const base = {
    control: 'radio' as const,
    name: 'product-group',
    value: 'prod-1',
    label: 'Flight Delay',
    productIds: ['quote-abc', 'quote-def'],
  };

  it('renders a label wrapping a radio input and text', () => {
    const el = buildSelectionControl(base);

    expect(el.tagName).toBe('LABEL');
    expect(el.className).toContain('cge-selection-radio');
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('radio');
    expect(input.name).toBe('product-group');
    expect(input.value).toBe('prod-1');
    expect(el.querySelector('span')?.textContent).toBe('Flight Delay');
  });

  it('renders a checkbox when control is checkbox', () => {
    const el = buildSelectionControl({ ...base, control: 'checkbox' });

    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('checkbox');
    expect(el.className).toContain('cge-selection-checkbox');
  });

  it('stamps data-cg-role and data-cg-product-ids', () => {
    const el = buildSelectionControl(base) as HTMLElement;

    expect(el.dataset.cgRole).toBe('selection-control');
    expect(el.dataset.cgProductIds).toBe('quote-abc quote-def');
  });

  it('sets checked state', () => {
    const unchecked = buildSelectionControl(base);
    const checked = buildSelectionControl({ ...base, checked: true });

    expect((unchecked.querySelector('input') as HTMLInputElement).checked).toBe(false);
    expect((checked.querySelector('input') as HTMLInputElement).checked).toBe(true);
  });

  it('does not inject styles into document.head', () => {
    buildSelectionControl(base);

    expect(document.getElementById('cge-selection-control-styles')).toBeNull();
  });

  it('has no inline styles on wrapper or input (styles live in the adopted stylesheet)', () => {
    const el = buildSelectionControl(base) as HTMLElement;
    const input = el.querySelector('input') as HTMLInputElement;

    expect(el.style.length).toBe(0);
    expect(input.style.length).toBe(0);
  });

  it('stylesheet defines selection control variables', () => {
    expect(COMPONENT_STYLES).toContain('--cge-selection-accent-color');
    expect(COMPONENT_STYLES).toContain('--cge-selection-border-color');
    expect(COMPONENT_STYLES).toContain('--cge-selection-border-width');
  });

  it('handles a single product id', () => {
    const el = buildSelectionControl({
      ...base,
      productIds: ['single-id'],
    }) as HTMLElement;

    expect(el.dataset.cgProductIds).toBe('single-id');
  });
});
