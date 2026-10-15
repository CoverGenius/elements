import { CG_DATASET } from '../shared/attributes';

export type BadgeType = 'pill' | 'default';
export type BadgeLocation =
  'resting_start' | 'resting_center' | 'resting_end' | 'above' | 'below' | 'inline_start' | 'inline_end';

export interface BadgeConfig {
  label: string;
  type: BadgeType;
  location?: BadgeLocation;
}

export function buildBadge({ label, type, location }: BadgeConfig): HTMLElement {
  const el = document.createElement('span');

  el.className = `cge-badge cge-badge-${type}`;
  el.textContent = label;

  if (location) {
    el.dataset[CG_DATASET.badgeLocation] = location;
    el.classList.add(`cge-badge-${location.replace(/_/g, '-')}`);
  }

  return el;
}
