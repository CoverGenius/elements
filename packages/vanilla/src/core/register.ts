import { resolveContext } from '../shared/context';
import { Element } from './element';
import { DEFAULT_TAG_NAME, getContext, hasContext, setContext } from './registry';
import type { RegisterElementsConfig } from '../shared/types';
import { registerSectionBuilders } from '../resolver/builders';

/**
 * Registers the <cg-elements> custom element. Page-level and idempotent, so
 * it is safe to call from multiple bundles. Call once per page before
 * getElement().
 *
 * Defines exactly one element; "Elements" is the product name, not a count.
 * Multiple placements are addressed via data-presentation-ref, not by calling
 * this again. Idempotency is first-call-wins: once registered, a later call is
 * a no-op and does not change the environment or currency config, nor try to
 * define the element class a second time.
 *
 * Does nothing where there is no custom-elements registry (server-side
 * rendering), so it is safe to call there; getElement() then returns undefined.
 */
export function registerElements(config: RegisterElementsConfig = { environment: 'production' }): void {
  if (typeof customElements === 'undefined') return;

  // First call wins. customElements.get() also catches the tag being defined by
  // another instance of this module (for example a second bundle on the same
  // page, which has its own contexts state), so there may be no context here
  // even though the guard trips.
  if (hasContext(DEFAULT_TAG_NAME) || customElements.get(DEFAULT_TAG_NAME)) {
    getContext(DEFAULT_TAG_NAME)?.logger.debug(
      `registerElements() called again; ignoring (first call wins, <${DEFAULT_TAG_NAME}> is already registered).`,
    );

    return;
  }

  const context = resolveContext(config);

  setContext(DEFAULT_TAG_NAME, context);

  registerSectionBuilders();

  context.logger.debug(`initialized <${DEFAULT_TAG_NAME}> at environment="${context.environment}"`);

  customElements.define(DEFAULT_TAG_NAME, Element);
}
