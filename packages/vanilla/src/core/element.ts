import { DEFAULT_TAG_NAME, defaultKey, getContainer, getContext } from './registry';
import { ensureContainer } from './container';
import type { ElementEventMap } from '../shared/types';
import { CG_ATTR, CG_ROLE, attrSelector } from '../shared/attributes';
import { bindInteraction } from '../resolver/interaction';
import { matchesOption, parseProductIds } from './selection-dom';
import { applyTheme as applyThemeToHost } from '../theme/apply-theme';
import { FONT_SIZE_BASE_DEFAULT } from '../theme/sdk-originated-defaults';
import type { Scheme, ThemeProfile } from '../shared/types';
import { COMPONENT_STYLES } from '../styles/generated/component-styles.generated';
export type PanelState = 'loading' | 'rendered' | 'hidden';

const HOST_BASELINE = `:host { all: initial; display: block; font-family: inherit; --cge-font-size-base: ${FONT_SIZE_BASE_DEFAULT}; }`;
const SHADOW_STYLES = `${HOST_BASELINE}\n${COMPONENT_STYLES}`;

/** Falls back to an inert base where HTMLElement is absent (server-side), so importing never throws. */
const BaseElement = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

export class Element extends BaseElement {
  #panelRoot: HTMLElement | null = null;

  connectedCallback(): void {
    this.setAttribute(CG_ATTR.elementsState, 'idle');

    this.#ensureShadow();

    ensureContainer(this.#key()).bindElement(this);
  }

  disconnectedCallback(): void {
    getContainer(this.#key())?.unbindElement(this);
  }

  setPanel(state: PanelState, dom?: DocumentFragment): void {
    this.setAttribute(CG_ATTR.elementsState, state);

    const root = this.#ensureShadow();

    root.replaceChildren();

    if (state === 'rendered' && dom) root.append((root.ownerDocument ?? document).importNode(dom, true));
  }

  applySelection(optionIds: string[]): void {
    const root = this.#panelRoot;

    if (!root) return;

    const selector = `${attrSelector(CG_ATTR.role, CG_ROLE.option)}, ${attrSelector(CG_ATTR.role, CG_ROLE.decline)}`;

    for (const el of root.querySelectorAll<HTMLElement>(selector)) {
      const selected = optionIds.some((id) => matchesOption(el, id));

      el.toggleAttribute(CG_ATTR.selected, selected);

      const control = el.matches('input') ? (el as HTMLInputElement) : el.querySelector<HTMLInputElement>('input');

      if (control) control.checked = selected;
    }
  }

  resolveOptionProductIds(optionId: string): string[] {
    const root = this.#panelRoot;

    if (!root) return [];

    for (const el of root.querySelectorAll<HTMLElement>(attrSelector(CG_ATTR.role, CG_ROLE.option)))
      if (matchesOption(el, optionId)) return parseProductIds(el.getAttribute(CG_ATTR.productIds));

    return [];
  }

  applyTheme(theme: ThemeProfile | undefined, scheme: Scheme): void {
    applyThemeToHost(theme, this, scheme, getContext(DEFAULT_TAG_NAME)?.logger);
  }

  applyRequired(required: boolean): void {
    this.toggleAttribute(CG_ATTR.elementsRequired, required);
  }

  emit<K extends keyof ElementEventMap>(event: K, detail: ElementEventMap[K]): void {
    getContainer(this.#key())?.emit(event, detail);
  }

  #ensureShadow(): HTMLElement {
    if (this.#panelRoot) return this.#panelRoot;

    // Reuse an existing shadowRoot on reconnect; attachShadow throws on a second call.
    const root = this.shadowRoot ?? this.attachShadow({ mode: 'open' });

    this.#adoptBaseline(root);

    const panel = document.createElement('div');

    panel.className = 'cg-panel';

    root.append(panel);

    this.#panelRoot = panel;

    this.#bindInteraction(panel);

    return panel;
  }

  #adoptBaseline(root: ShadowRoot): void {
    if (typeof CSSStyleSheet === 'function' && 'adoptedStyleSheets' in root) {
      try {
        const sheet = new CSSStyleSheet();

        sheet.replaceSync(SHADOW_STYLES);

        root.adoptedStyleSheets = [sheet];

        return;
      } catch {
        // fall through to the inline style
      }
    }

    const style = document.createElement('style');

    style.textContent = SHADOW_STYLES;

    root.append(style);
  }

  #bindInteraction(root: HTMLElement): void {
    bindInteraction(
      root,
      {
        select: (productIds, optionId) => getContainer(this.#key())?.handleUserSelection(productIds, optionId),
        toggle: (productIds, optionId, maxSelect) =>
          getContainer(this.#key())?.handleUserToggle(productIds, optionId, maxSelect),
        decline: (optionId) => getContainer(this.#key())?.handleDecline(optionId),
      },
      getContext(DEFAULT_TAG_NAME)?.logger,
    );
  }

  #key() {
    return this.getAttribute('data-presentation-ref') ?? defaultKey();
  }
}
