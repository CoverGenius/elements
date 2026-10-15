export type PriceType = 'default' | 'block';
export type PriceDisplayLocation = 'inline_end' | 'below';

export interface PriceConfig {
  formatted: string;
  label?: string;
  type?: PriceType;
  location?: PriceDisplayLocation;
}

export function buildPrice({ formatted, label, type = 'default', location }: PriceConfig): HTMLElement {
  const wrapper = document.createElement('div');
  const locationClass = location ? ` cge-price-${location.replace(/_/g, '-')}` : '';
  wrapper.className = `cge-price cge-price-${type}${locationClass}`;

  const amount = document.createElement('span');
  amount.className = 'cge-price-amount';
  amount.textContent = formatted;
  wrapper.appendChild(amount);

  if (label) {
    const sub = document.createElement('span');
    sub.className = 'cge-price-label';
    sub.textContent = label;
    wrapper.appendChild(sub);
  }

  return wrapper;
}
