import { CG_DATASET } from '../shared/attributes';
import { resolveIcon } from './icon';
import { ICON_REGISTRY } from '../shared/icon-registry';

export type ListType = 'default' | 'panel' | 'pills' | 'timeline';

export type ListVariant = 'benefits' | 'inclusions' | 'exclusions';

export interface ListItem {
  name: string;
  text: string;
  icon?: string;
  description?: string;
}

export interface ListConfig {
  type: ListType;
  items: ListItem[];
  heading?: string;
  variant?: ListVariant;
}

const TICK_DEFAULTS: Record<ListVariant, { icon: string; modifier?: string }> = {
  benefits: { icon: 'check' },
  inclusions: { icon: 'plus' },
  exclusions: { icon: 'close', modifier: 'cge-list-tick-exclusion' },
};

function appendIcon(parent: HTMLElement, iconName: string | undefined): void {
  if (!iconName) return;
  parent.appendChild(resolveIcon({ name: iconName }));
}

function buildTickItem(item: ListItem, variant: ListVariant): HTMLElement {
  const li = document.createElement('li');
  li.className = 'cge-list-tick-item';
  li.dataset[CG_DATASET.benefitName] = item.name;

  if (item.icon) {
    li.appendChild(resolveIcon({ name: item.icon, decorative: true }));
  } else {
    const tickDefault = TICK_DEFAULTS[variant];
    const tick = document.createElement('span');
    tick.className = tickDefault.modifier ? `cge-list-tick ${tickDefault.modifier}` : 'cge-list-tick';
    tick.innerHTML = ICON_REGISTRY[tickDefault.icon] ?? '';
    tick.setAttribute('aria-hidden', 'true');
    li.appendChild(tick);
  }

  const content = document.createElement('span');
  content.className = 'cge-list-tick-content';
  content.textContent = item.text;

  li.appendChild(content);
  return li;
}

function buildPillItem(item: ListItem): HTMLElement {
  const span = document.createElement('span');
  span.className = 'cge-list-pill';
  span.dataset[CG_DATASET.benefitName] = item.name;

  appendIcon(span, item.icon);

  const text = document.createElement('span');
  text.textContent = item.text;
  span.appendChild(text);
  return span;
}

function buildPanelItem(item: ListItem): HTMLElement {
  const li = document.createElement('li');
  li.className = 'cge-list-panel-item';
  li.dataset[CG_DATASET.benefitName] = item.name;

  if (item.icon) {
    li.appendChild(resolveIcon({ name: item.icon, decorative: true }));
  }

  const body = document.createElement('div');
  body.className = 'cge-list-panel-body';

  const title = document.createElement('strong');
  title.className = 'cge-list-panel-title';
  title.textContent = item.text;
  body.appendChild(title);

  if (item.description) {
    const desc = document.createElement('span');
    desc.className = 'cge-list-panel-description';
    desc.textContent = item.description;
    body.appendChild(desc);
  }

  li.appendChild(body);
  return li;
}

function buildTimelineItem(item: ListItem, isLast: boolean): HTMLElement {
  const li = document.createElement('li');
  li.className = 'cge-list-timeline-item';
  li.dataset[CG_DATASET.benefitName] = item.name;

  const dot = document.createElement('span');
  dot.className = 'cge-list-timeline-dot';
  dot.setAttribute('aria-hidden', 'true');

  if (!isLast) {
    const line = document.createElement('span');
    line.className = 'cge-list-timeline-line';
    line.setAttribute('aria-hidden', 'true');
    li.appendChild(line);
  }

  const content = document.createElement('span');
  content.textContent = item.text;

  li.appendChild(dot);
  appendIcon(li, item.icon);
  li.appendChild(content);
  return li;
}

export function buildList({ type, items, heading, variant = 'benefits' }: ListConfig): HTMLElement {
  let list: HTMLElement;

  if (type === 'pills') {
    list = document.createElement('div');
    list.className = 'cge-list cge-list-pills';
    for (const item of items) {
      list.appendChild(buildPillItem(item));
    }
  } else {
    list = document.createElement('ul');
    list.className = `cge-list cge-list-${type}`;

    for (let i = 0; i < items.length; i++) {
      const isLast = i === items.length - 1;
      if (type === 'panel') {
        list.appendChild(buildPanelItem(items[i]));
      } else if (type === 'timeline') {
        list.appendChild(buildTimelineItem(items[i], isLast));
      } else {
        list.appendChild(buildTickItem(items[i], variant));
      }
    }
  }

  if (!heading) return list;

  const container = document.createElement('div');
  container.className = 'cge-list-container';
  const h = document.createElement('h3');
  h.className = 'cge-list-heading';
  h.textContent = heading;
  container.appendChild(h);
  container.appendChild(list);
  return container;
}
