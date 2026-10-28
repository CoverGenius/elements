import {
  buildList,
  buildBadge,
  buildMessage,
  buildTermsLink,
  buildButton,
  type BadgeLocation,
  type ListItem,
  type ListVariant,
  type PriceConfig,
  buildPrice,
} from '../components';
import { CG_DATASET, CG_ROLE } from '../shared/attributes';

export type InputBodySelectionLocation = 'inline_start' | 'inline_end' | 'bottom';

export type InputBodyLayout = 'stacked' | 'side_by_side';

export interface InputBodyLink {
  href: string;
  label: string;
}

export interface InputBodyOption {
  control: 'radio' | 'checkbox' | 'cta';
  name: string;
  value: string;
  optionId: string;
  label: string;
  productIds: string[];
  checked?: boolean;
  badge?: { label: string; location?: BadgeLocation };
  description?: string;
  subtitle?: string;
  benefits?: ListItem[];
  inclusions?: ListItem[];
  exclusions?: ListItem[];
  links?: InputBodyLink[];
  termsLink?: { href: string; label: string };
  warningMessage?: string;
  infoPanel?: { content: string; location: 'top' | 'bottom' };
  error?: boolean;
  decline?: boolean;
  collapsed?: boolean;
  price?: PriceConfig;
  buttonLabel?: string;
  buttonVariant?: 'primary' | 'secondary';
  buttonSelectedLabel?: string;
}

export type InputBodyTextAlign = 'start' | 'center';
export type InputBodyContentAlign = 'title' | 'radio';

export interface InputBodyConfig {
  options: InputBodyOption[];
  layout?: InputBodyLayout;
  textAlign?: InputBodyTextAlign;
  contentAlign?: InputBodyContentAlign;
  /**
   * `inline_start` | `inline_end` place the radio/checkbox; `inline_end` | `bottom` place the CTA button.
   * An unsupported value falls back to the default for the control kind.
   */
  selectionLocation?: InputBodySelectionLocation;
  multiple?: boolean;
  maxSelect?: number;
}

const RESTING_LOCATIONS: ReadonlySet<string> = new Set(['resting_start', 'resting_center', 'resting_end']);

/** radio/checkbox use inline_start|inline_end, CTA uses inline_end|bottom; anything else falls back to the default for that control. */
function resolveSelectionLocation(
  control: InputBodyOption['control'],
  requested: InputBodySelectionLocation | undefined,
  layout: InputBodyLayout | undefined,
): InputBodySelectionLocation {
  if (control !== 'cta') return requested === 'inline_end' ? 'inline_end' : 'inline_start';

  if (requested === 'inline_end' || requested === 'bottom') return requested;

  return layout === 'side_by_side' ? 'bottom' : 'inline_end';
}

function appendControlLayout(
  panel: HTMLElement,
  opt: InputBodyOption,
  selectionLocation: InputBodySelectionLocation,
  controlContainer?: HTMLElement,
): HTMLElement {
  const input = document.createElement('input');
  input.type = opt.control;
  input.name = opt.name;
  input.id = `${opt.name}-${opt.value}`;
  input.value = opt.value;
  input.checked = opt.checked ?? false;
  input.dataset[CG_DATASET.role] = CG_ROLE.selectionControl;

  const controlDiv = document.createElement('div');
  controlDiv.className = 'cge-input-option-control';
  controlDiv.appendChild(input);

  const contentDiv = document.createElement('div');
  contentDiv.className = 'cge-input-option-content';

  if (selectionLocation === 'inline_end') {
    panel.appendChild(contentDiv);
    (controlContainer ?? panel).appendChild(controlDiv);
  } else {
    panel.appendChild(controlDiv);
    panel.appendChild(contentDiv);
  }

  return contentDiv;
}

function buildOptionBadge(badge: { label: string; location?: BadgeLocation }): HTMLElement {
  return buildBadge({ label: badge.label, type: 'pill', location: badge.location });
}

function buildOptionButton(
  opt: InputBodyOption,
  selectionLocation?: InputBodySelectionLocation,
): HTMLElement | undefined {
  if (!opt.buttonLabel) return;

  const button = buildButton({
    label: opt.buttonLabel,
    variant: opt.buttonVariant ?? (opt.decline ? 'secondary' : 'primary'),
    selectedLabel: opt.buttonSelectedLabel,
  });
  button.dataset[CG_DATASET.role] = opt.decline ? CG_ROLE.decline : CG_ROLE.submit;
  button.dataset[CG_DATASET.productIds] = opt.productIds.join(' ');
  button.dataset[CG_DATASET.optionId] = opt.optionId;

  if (selectionLocation === 'inline_end') button.classList.add('cge-button-inline-end');

  return button;
}

function buildHeaderTrailing(opt: InputBodyOption, priceElement: HTMLElement | undefined): HTMLElement | undefined {
  const trailing = document.createElement('div');

  trailing.className = 'cge-input-option-header-trailing';

  if (priceElement && (opt.price?.location ?? 'inline_end') === 'inline_end') {
    trailing.appendChild(priceElement);
  }

  if (opt.badge?.location === 'inline_end') {
    trailing.appendChild(buildOptionBadge(opt.badge));
  }

  return trailing.hasChildNodes() ? trailing : undefined;
}

function buildOption(
  opt: InputBodyOption,
  textAlign: InputBodyTextAlign = 'start',
  contentAlign: InputBodyContentAlign = 'title',
  selectionLocation: InputBodySelectionLocation,
): HTMLElement {
  const panel = document.createElement('div');
  const classes = ['cge-input-option'];
  if (opt.checked) classes.push('cge-input-option-selected');
  if (opt.error) classes.push('cge-input-option-error');
  if (opt.collapsed) classes.push('cge-input-option-collapsed');
  panel.dataset[CG_DATASET.role] = opt.decline ? CG_ROLE.decline : CG_ROLE.option;
  panel.dataset[CG_DATASET.productIds] = opt.productIds.join(' ');
  panel.dataset[CG_DATASET.optionId] = opt.optionId;
  panel.className = classes.join(' ');

  const location = opt.badge?.location;

  if (opt.badge && location && RESTING_LOCATIONS.has(location)) {
    panel.appendChild(buildOptionBadge(opt.badge));
  }

  let aboveRow: HTMLElement | undefined;
  if (opt.badge && location === 'above') {
    const badge = buildOptionBadge(opt.badge);
    if (opt.control === 'cta') {
      panel.appendChild(badge);
    } else {
      aboveRow = document.createElement('div');
      aboveRow.className = 'cge-input-option-above';
      aboveRow.appendChild(badge);
      panel.appendChild(aboveRow);
    }
  }

  // CSS cannot reparent the inline badge, so a hidden "above" copy is swapped in by the small-container query.
  if (opt.badge && (location === 'inline_start' || location === 'inline_end')) {
    const responsiveAbove = document.createElement('div');
    responsiveAbove.className = 'cge-input-option-above cge-input-option-above-responsive';
    responsiveAbove.appendChild(buildOptionBadge({ label: opt.badge.label, location: 'above' }));
    panel.appendChild(responsiveAbove);
  }

  const target =
    opt.control === 'cta'
      ? panel
      : appendControlLayout(panel, opt, selectionLocation, selectionLocation === 'inline_end' ? aboveRow : undefined);

  const ctaButton = opt.control === 'cta' ? buildOptionButton(opt, selectionLocation) : undefined;

  const priceElement = opt.price ? buildPrice(opt.price) : undefined;

  const priceLocation = opt.price?.location ?? 'inline_end';

  if (opt.control === 'cta') {
    const isCentered = textAlign === 'center';
    const header = document.createElement('div');
    header.className = isCentered
      ? 'cge-input-option-header cge-input-option-header-cta cge-input-option-header-center'
      : 'cge-input-option-header cge-input-option-header-cta';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'cge-input-option-label';
    labelSpan.textContent = opt.label;
    header.appendChild(labelSpan);

    if (opt.badge && location === 'inline_start') {
      header.appendChild(buildOptionBadge(opt.badge));
    }

    const trailing = buildHeaderTrailing(opt, priceElement);

    if (trailing) header.appendChild(trailing);

    target.appendChild(header);
  } else {
    const header = document.createElement('div');
    header.className = 'cge-input-option-header';

    const labelEl = document.createElement('label');
    labelEl.className = 'cge-input-option-label';
    labelEl.htmlFor = `${opt.name}-${opt.value}`;
    labelEl.textContent = opt.label;
    header.appendChild(labelEl);

    if (opt.badge && location === 'inline_start') {
      header.appendChild(buildOptionBadge(opt.badge));
    }

    const trailing = buildHeaderTrailing(opt, priceElement);

    if (trailing) header.appendChild(trailing);

    target.appendChild(header);
  }

  if (priceElement && priceLocation === 'below') {
    target.appendChild(priceElement);
  }

  const body = document.createElement('div');
  body.className = 'cge-input-option-body';

  if (opt.infoPanel?.location === 'top') {
    body.appendChild(buildMessage({ kind: 'info', content: opt.infoPanel.content }));
  }

  if (opt.subtitle) {
    const sub = document.createElement('p');
    sub.className = 'cge-input-option-subtitle';
    sub.textContent = opt.subtitle;
    body.appendChild(sub);
  }

  if (opt.badge && location === 'below') {
    body.appendChild(buildOptionBadge(opt.badge));
  }

  if (opt.description) {
    const desc = document.createElement('p');
    desc.className = 'cge-input-option-description';
    desc.textContent = opt.description;
    body.appendChild(desc);
  }

  const optionLists: Array<{ items?: ListItem[]; variant: ListVariant }> = [
    { items: opt.benefits, variant: 'benefits' },
    { items: opt.inclusions, variant: 'inclusions' },
    { items: opt.exclusions, variant: 'exclusions' },
  ];
  for (const { items, variant } of optionLists) {
    if (items && items.length > 0) {
      const list = buildList({ type: 'default', items, variant });
      list.classList.add('cge-input-option-list');
      if (variant === 'benefits') list.classList.add('cge-input-option-benefits');
      body.appendChild(list);
    }
  }

  const shouldPlaceCtaLinksAfterButton =
    opt.control === 'cta' && Boolean(opt.buttonLabel) && selectionLocation === 'bottom';
  let ctaLinks: HTMLElement | undefined;
  if (opt.links && opt.links.length > 0) {
    const linksContainer = document.createElement('div');
    linksContainer.className = `cge-option-links${shouldPlaceCtaLinksAfterButton ? ' cge-option-links-cta' : ''}`;
    for (let i = 0; i < opt.links.length; i++) {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className = 'cge-option-links-separator';
        sep.textContent = '|';
        linksContainer.appendChild(sep);
      }
      linksContainer.appendChild(buildTermsLink(opt.links[i]));
    }
    if (shouldPlaceCtaLinksAfterButton) {
      ctaLinks = linksContainer;
    } else {
      body.appendChild(linksContainer);
    }
  } else if (opt.termsLink) {
    const termsLink = buildTermsLink(opt.termsLink);
    if (shouldPlaceCtaLinksAfterButton) {
      ctaLinks = document.createElement('div');
      ctaLinks.className = 'cge-option-links cge-option-links-cta';
      ctaLinks.appendChild(termsLink);
    } else {
      body.appendChild(termsLink);
    }
  }

  if (opt.warningMessage) {
    body.appendChild(buildMessage({ kind: 'warning', content: opt.warningMessage }));
  }

  if (opt.infoPanel?.location === 'bottom') {
    body.appendChild(buildMessage({ kind: 'info', content: opt.infoPanel.content }));
  }

  if (body.hasChildNodes()) {
    const collapseWrapper = document.createElement('div');
    collapseWrapper.className = 'cge-input-option-collapse';
    collapseWrapper.appendChild(body);
    // Decline defaults to selector-aligned content regardless of the section's
    // contentAlign, until opt_out.content_align exists as its own per-option field.
    const isRadioAligned = opt.decline || contentAlign === 'radio';
    const bodyParent = isRadioAligned && opt.control !== 'cta' ? panel : target;
    bodyParent.appendChild(collapseWrapper);
  }

  if (ctaButton) {
    target.appendChild(ctaButton);
  }

  if (ctaLinks) {
    const linksCollapse = document.createElement('div');
    linksCollapse.className = 'cge-input-option-collapse';
    linksCollapse.appendChild(ctaLinks);
    target.appendChild(linksCollapse);
  }

  return panel;
}

export function buildInputBody(config: InputBodyConfig): HTMLElement {
  const el = document.createElement('section');
  el.className = 'cge-section cge-section-input-body';

  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'cge-input-body-options';

  if (config.multiple) {
    optionsContainer.dataset[CG_DATASET.selectMode] = 'multiple';

    if (config.maxSelect) optionsContainer.dataset[CG_DATASET.maxSelect] = String(config.maxSelect);
  }

  const align = config.textAlign ?? 'start';
  const contentAlign = config.contentAlign ?? 'title';

  const locationFor = (opt: InputBodyOption) =>
    resolveSelectionLocation(opt.control, config.selectionLocation, config.layout);

  if (config.layout === 'side_by_side') {
    const primary = config.options.filter((o) => !o.decline);
    const decline = config.options.filter((o) => o.decline);

    const row = document.createElement('div');
    row.className = 'cge-input-options-row';
    for (const opt of primary) {
      row.appendChild(buildOption(opt, align, contentAlign, locationFor(opt)));
    }
    optionsContainer.appendChild(row);

    for (const opt of decline) {
      optionsContainer.appendChild(buildOption(opt, align, contentAlign, locationFor(opt)));
    }
  } else {
    for (const opt of config.options) {
      optionsContainer.appendChild(buildOption(opt, align, contentAlign, locationFor(opt)));
    }
  }

  el.appendChild(optionsContainer);

  return el;
}
