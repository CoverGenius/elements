import type { Container } from './container';
import type { ElementEventMap, OfferResponse, SelectionApi } from '../shared/types';

/**
 * The partner-facing handle for one <cg-elements> placement, returned by
 * getElement(). Records partner intent onto the container and has no knowledge
 * of the DOM node. Handlers bound with on() survive every subsequent render().
 */
export interface Client {
  render(response: OfferResponse): void;
  on<K extends keyof ElementEventMap>(event: K, callback: (detail: ElementEventMap[K]) => void): void;
  selection: SelectionApi;
  unmount(): void;
}

/** Builds the client for a container. One client per placement. */
export function createClient(container: Container): Client {
  return {
    render(response) {
      container.setResponse(response);
    },

    on(event, callback) {
      // One callback per event, last call wins: a later on() for the same event
      // replaces the earlier one, so re-binding on every framework render cannot
      // stack handlers and fire an event more than once.
      container.setHandler(event, callback);
    },

    selection: {
      set(optionId) {
        container.setSelection(optionId);
      },

      reset() {
        container.setSelection(null);
      },

      get() {
        return container.getSelection();
      },

      getAll() {
        return container.getAllSelections();
      },

      required() {
        container.setRequired();
      },
    },

    unmount() {
      container.unmount();
    },
  };
}
