import { buildHeading } from '../components/heading';
import { buildBadge } from '../components/badge';
import { resolveIcon } from '../components/icon';
import type { HeaderBadgeLocation } from '../resolver/layout';

export type { HeaderBadgeLocation };

export interface HeaderConfig {
  heading?: string;
  icon?: string;
  badge?: { label: string; location?: HeaderBadgeLocation };
}

export function buildHeader({ heading, icon, badge }: HeaderConfig): HTMLElement {
  const el = document.createElement('section');
  el.className = 'cge-section cge-section-header';

  const location = badge?.location ?? 'inline_end';

  if (badge && location === 'above') {
    el.appendChild(buildBadge({ label: badge.label, type: 'pill', location }));
  }

  const row = document.createElement('div');
  row.className = 'cge-header-row';

  if (icon) {
    row.appendChild(resolveIcon({ name: icon, decorative: true }));
  }

  if (heading) {
    row.appendChild(buildHeading({ text: heading, variant: 'header' }));
  }

  if (badge && location !== 'above') {
    const badgeEl = buildBadge({ label: badge.label, type: 'pill', location });
    if (location === 'inline_end') {
      badgeEl.classList.add('cge-header-badge-end');
    }
    row.appendChild(badgeEl);
  }

  el.appendChild(row);

  return el;
}
