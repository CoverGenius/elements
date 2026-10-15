import { createClient, type Client } from './client';
import type { Element } from './element';
import { DEFAULT_TAG_NAME, deleteContainer, getContainer, getContext, setContainer } from './registry';
import { resolvePresentation } from '../resolver/resolver';
import type { ElementEventMap, OfferResponse, Scheme, ThemeProfile } from '../shared/types';

export type ContainerState =
  { status: 'loading' } | { status: 'rendered'; dom: DocumentFragment } | { status: 'error' };

type StoredOption = { optionId: string; productIds: string[] };

/**
 * The per-placement owner of state, selection, panel flags, and event routing.
 * The client and element never reference each other: the client sets state the
 * container reflects onto the element, and the element reports events the
 * container routes to the client's handler.
 */
export interface Container {
  readonly key: string;
  getClient(): Client;
  setResponse(response: OfferResponse): void;
  setState(state: ContainerState): void;
  setError(detail: ElementEventMap['error']): void;
  setSelection(optionId: string | null): void;
  getSelection(): string | null;
  getAllSelections(): string[];
  handleUserSelection(productIds: string[], optionId: string): void;
  handleUserToggle(productIds: string[], optionId: string, maxSelect?: number): void;
  handleDecline(optionId: string): void;
  setRequired(): void;
  unmount(): void;
  setHandler<K extends keyof ElementEventMap>(event: K, callback: (detail: ElementEventMap[K]) => void): void;
  emit<K extends keyof ElementEventMap>(event: K, detail: ElementEventMap[K]): void;
  bindElement(element: Element): void;
  unbindElement(element: Element): void;
}

/**
 * Returns the container for a key, creating it on first access. getElement() and
 * the element's connectedCallback both call this, so whichever runs first
 * creates it and the other finds the same one.
 */
export function ensureContainer(key: string): Container {
  const existing = getContainer(key);

  if (existing) return existing;

  const container = createContainer(key);

  setContainer(key, container);

  return container;
}

function selectionSurvives(selection: StoredOption, response: OfferResponse): boolean {
  if (selection.productIds.length > 0) {
    const offered = new Set(response.products?.map((p) => p.id));

    return selection.productIds.every((id) => offered.has(id));
  }

  const layout = (response.presentation as { layout?: { input_body?: { opt_out?: unknown } } }).layout;

  return layout?.input_body?.opt_out != null;
}

function createContainer(key: string): Container {
  const handlers = new Map<keyof ElementEventMap, (detail: never) => void>();

  const stack: Element[] = [];

  const scheme: Scheme = context()?.scheme ?? 'light';

  let element: Element | null = null,
    state: ContainerState = { status: 'loading' },
    selection: StoredOption[] = [],
    theme: ThemeProfile | undefined = undefined,
    required = false,
    client: Client | null = null,
    reflected: ContainerState | null = null,
    readyEmitted = false,
    unmounted = false;

  function context() {
    return getContext(DEFAULT_TAG_NAME);
  }

  function logger() {
    return getContext(DEFAULT_TAG_NAME)?.logger;
  }

  function reflect(): void {
    if (!element) return;

    if (reflected === state) return;
    reflected = state;

    if (state.status === 'rendered') {
      element.applyTheme(theme, scheme);

      element.setPanel('rendered', state.dom);
    } else if (state.status === 'error') element.setPanel('hidden');
    else element.setPanel('loading');
  }

  function paintSelection(): void {
    element?.applySelection(selection.map((s) => s.optionId));

    element?.applyRequired(required);
  }

  const container: Container = {
    key,

    getClient() {
      client ??= createClient(container);

      return client;
    },

    setResponse(response) {
      if (unmounted) {
        logger()?.warn(`render() on an unmounted placement "${key}" is a no-op; call getElement() again.`);

        return;
      }

      const ctx = context();

      if (!ctx) {
        this.setError({
          code: 'not_registered',
          message: 'SDK context is unavailable; call registerElements() before render().',
        });

        return;
      }

      const result = resolvePresentation(response, ctx);

      if ('error' in result) {
        this.setError(result.error);

        return;
      }

      theme = (response.presentation as { theme?: ThemeProfile }).theme;

      const surviving = selection.filter((s) => selectionSurvives(s, response));

      if (surviving.length !== selection.length) {
        selection = surviving;

        if (!selection.length) required = false;
      }

      this.setState({ status: 'rendered', dom: result.dom });

      paintSelection();
    },

    setState(next) {
      if (next === state) return;

      state = next;

      reflect();

      if (!readyEmitted && state.status === 'rendered') {
        readyEmitted = true;

        this.emit('ready', undefined as void);
      }
    },

    setError(detail) {
      if (state.status !== 'error') this.emit('error', detail);

      this.setState({ status: 'error' });
    },

    setSelection(optionId) {
      if (unmounted) return;

      selection = optionId === null ? [] : [{ optionId, productIds: element?.resolveOptionProductIds(optionId) ?? [] }];

      required = false;

      paintSelection();
    },

    getSelection() {
      return selection.at(-1)?.optionId ?? null;
    },

    getAllSelections() {
      return selection.map((s) => s.optionId);
    },

    handleUserSelection(productIds, optionId) {
      if (!productIds.length) return;

      selection = [{ optionId, productIds }];

      required = false;

      paintSelection();

      this.emit('change', { selectedOption: optionId, selectedProductIDs: productIds });
    },

    handleUserToggle(productIds, optionId, maxSelect) {
      if (!productIds.length) {
        paintSelection();

        return;
      }

      const isSelected = selection.some((s) => s.optionId === optionId);

      const others = selection.filter((s) => s.optionId !== optionId && s.productIds.length > 0);

      if (!isSelected && maxSelect !== undefined && others.length >= maxSelect) {
        paintSelection();

        return;
      }

      selection = isSelected ? others : [...others, { optionId, productIds }];

      required = false;

      paintSelection();

      this.emit('change', {
        selectedOption: optionId,
        selectedProductIDs: selection.flatMap((s) => s.productIds),
      });
    },

    handleDecline(optionId) {
      selection = [{ optionId, productIds: [] }];

      required = false;

      paintSelection();

      this.emit('change', { selectedOption: optionId, selectedProductIDs: [], declined: true });
    },

    setRequired() {
      if (unmounted) return;

      if (selection.length) {
        logger()?.debug('selection.required() ignored: an option is already selected.');

        return;
      }

      required = true;

      element?.applyRequired(required);
    },

    setHandler(event, callback) {
      handlers.set(event, callback as (detail: never) => void);
    },

    emit(event, detail) {
      const handler = handlers.get(event) as ((d: typeof detail) => void) | undefined;

      handler?.(detail);
    },

    bindElement(next) {
      if (element && element !== next)
        logger()?.warn(`Two <cg-elements> resolve to "${key}"; the most recent one wins.`);

      // connect/disconnect alternate, so an element is never on the stack twice.
      stack.push(next);

      element = next;

      reflected = null;

      reflect();

      paintSelection();
    },

    unbindElement(previous) {
      const idx = stack.indexOf(previous);

      if (idx !== -1) stack.splice(idx, 1);

      if (element === previous) {
        element = stack[stack.length - 1] ?? null;

        reflected = null;

        if (element) {
          reflect();

          paintSelection();
        }
      }
    },

    unmount() {
      for (const el of stack) {
        el.applySelection([]);
        el.applyRequired(false);
        el.setPanel('hidden');
      }

      stack.length = 0;
      element = null;
      state = { status: 'loading' };
      selection = [];
      theme = undefined;
      required = false;
      reflected = null;
      client = null;
      handlers.clear();

      unmounted = true;

      if (getContainer(key) === container) deleteContainer(key);
    },
  };

  return container;
}
