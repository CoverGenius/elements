import { buildTermsLink, buildList, buildMessage, type ListItem, ListType, ListVariant } from '../components';

export type PanelLocation = 'top' | 'middle' | 'bottom';

export interface ListBlock {
  heading?: string;
  items: ListItem[];
  type?: ListType;
}

export interface PanelBlock {
  content: string;
  title?: string;
  iconName?: string;
  location?: PanelLocation;
}

export interface TopBodyConfig {
  heading?: string;
  subheading?: string;
  termsLink?: { href: string; label: string };
  benefits?: ListBlock;
  inclusions?: ListBlock;
  exclusions?: ListBlock;
  requiredPanel?: PanelBlock;
  infoMessage?: PanelBlock;
}

function appendInfoMessage(parent: HTMLElement, msg: PanelBlock): void {
  parent.appendChild(buildMessage({ kind: 'info', content: msg.content, title: msg.title, iconName: msg.iconName }));
}

function appendRequiredMessage(parent: HTMLElement, msg: PanelBlock): void {
  const required = document.createElement('p');
  required.className = 'cge-required-inline';
  required.textContent = msg.content;
  parent.appendChild(required);
}

function appendPanels(parent: HTMLElement, config: TopBodyConfig, location: PanelLocation): void {
  if ((config.infoMessage?.location ?? 'bottom') === location && config.infoMessage) {
    appendInfoMessage(parent, config.infoMessage);
  }

  if ((config.requiredPanel?.location ?? 'bottom') === location && config.requiredPanel) {
    appendRequiredMessage(parent, config.requiredPanel);
  }
}

function appendList(parent: HTMLElement, block: ListBlock, variant: ListVariant): void {
  parent.appendChild(buildList({ type: block.type ?? 'default', items: block.items, heading: block.heading, variant }));
}

export function buildTopBody(config: TopBodyConfig): HTMLElement {
  const el = document.createElement('section');
  el.className = 'cge-section cge-section-top-body';

  if (config.heading) {
    const heading = document.createElement('h3');
    heading.className = 'cge-top-body-heading';
    heading.textContent = config.heading;
    el.appendChild(heading);
  }

  appendPanels(el, config, 'top');

  if (config.subheading) {
    const sub = document.createElement('p');
    sub.className = 'cge-section-subheading';
    sub.textContent = config.subheading;

    if (config.termsLink) {
      sub.append(' ', buildTermsLink(config.termsLink));
    }

    el.appendChild(sub);
  } else if (config.termsLink) {
    el.appendChild(buildTermsLink(config.termsLink));
  }

  appendPanels(el, config, 'middle');

  if (config.benefits) appendList(el, config.benefits, 'benefits');
  if (config.inclusions) appendList(el, config.inclusions, 'inclusions');
  if (config.exclusions) appendList(el, config.exclusions, 'exclusions');

  appendPanels(el, config, 'bottom');

  return el;
}
