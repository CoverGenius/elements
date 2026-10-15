import { CG_DATASET } from '../shared/attributes';
import { ICON_REGISTRY, ICON_FALLBACK } from '../shared/icon-registry';

export interface IconConfig {
  name: string;
  decorative?: boolean;
  label?: string;
}

export function resolveIcon({ name, decorative = false, label }: IconConfig): HTMLElement {
  const el = document.createElement('span');
  el.className = 'cge-icon';
  el.dataset[CG_DATASET.icon] = name;

  if (decorative) {
    el.setAttribute('aria-hidden', 'true');
  } else {
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', label ?? name.replace(/-/g, ' '));
  }

  el.innerHTML = ICON_REGISTRY[name] ?? ICON_FALLBACK;
  return el;
}
