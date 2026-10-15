import { describe, expect, it, vi, afterEach } from 'vitest';
import { ensureContainer } from '../core/container';
import { clearContainers, clearContexts, getContainer } from '../core/registry';

// The containers map is process-wide shared state, so each test uses a unique
// key for a fresh container and afterEach clears the map. These tests exercise
// the container in isolation, its state reflection (Out to In) and event routing
// (In to Out), with a fake element. element-binding.spec.ts covers the real
// connectedCallback binding.

afterEach(() => {
  clearContainers();
});

// Records how the container drove the element through the single setPanel seam,
// so tests assert reflection by behaviour rather than by reading a private
// element reference. `calls` keeps the reflected state names ('rendered' /
// 'loading' / 'hidden') so existing assertions read naturally.
function fakeElement() {
  return {
    calls: [] as string[],
    lastPanelDom: undefined as unknown,
    lastSelection: undefined as unknown,
    lastRequired: undefined as unknown,
    lastTheme: undefined as unknown,
    lastScheme: undefined as unknown,
    setPanel(state: string, dom?: unknown) {
      this.calls.push(state);
      this.lastPanelDom = dom;
    },
    applyTheme(theme: unknown, scheme: unknown) {
      this.lastTheme = theme;
      this.lastScheme = scheme;
    },
    applySelection(optionId: unknown) {
      this.lastSelection = optionId;
    },
    applyRequired(required: unknown) {
      this.lastRequired = required;
    },
    resolveOptionProductIds(_optionId: string): string[] {
      return [];
    },
  };
}

function fragment() {
  return document.createDocumentFragment();
}

describe('container: creation and identity', () => {
  it('ensureContainer returns the same container for a key (singleton)', () => {
    expect(ensureContainer('cg-identity')).toBe(ensureContainer('cg-identity'));
  });

  it('stores the container in the registry under its key', () => {
    const container = ensureContainer('cg-registered');

    expect(getContainer('cg-registered')).toBe(container);
  });

  it('getClient returns the same client every time (singleton per placement)', () => {
    const container = ensureContainer('cg-client-identity');

    expect(container.getClient()).toBe(container.getClient());
  });
});

describe('container: state reflection (Out to In)', () => {
  it('does not throw when state is set before an element is bound', () => {
    const container = ensureContainer('cg-prebind');

    expect(() => container.setState({ status: 'rendered', dom: fragment() })).not.toThrow();
  });

  it('reflects the current state onto the element when it binds (lazy)', () => {
    const container = ensureContainer('cg-lazy');
    const el = fakeElement();
    const dom = fragment();

    container.setState({ status: 'rendered', dom });
    container.bindElement(el as never);

    expect(el.calls).toContain('rendered');
    expect(el.lastPanelDom).toBe(dom);
  });

  it('a freshly bound element reflects the default loading state', () => {
    const container = ensureContainer('cg-initial-loading');
    const el = fakeElement();

    container.bindElement(el as never);

    expect(el.calls).toEqual(['loading']);
  });

  it('reflects an error state as a hidden element', () => {
    const container = ensureContainer('cg-error-hide');
    const el = fakeElement();
    container.bindElement(el as never);

    container.setState({ status: 'error' });

    expect(el.calls).toContain('hidden');
  });

  it('does not re-reflect an unchanged state on rebind (idempotency guard)', () => {
    const container = ensureContainer('cg-idempotent');
    const first = fakeElement();
    container.setState({ status: 'rendered', dom: fragment() });
    container.bindElement(first as never);

    const renders = first.calls.filter((c) => c === 'rendered').length;

    expect(renders).toBe(1);
  });

  it('does not re-reflect when setState is called again with the same state reference', () => {
    const container = ensureContainer('cg-idempotent-setstate');
    const el = fakeElement();
    const rendered = { status: 'rendered', dom: fragment() } as const;
    container.bindElement(el as never);

    container.setState(rendered);
    container.setState(rendered);

    const renders = el.calls.filter((c) => c === 'rendered').length;

    expect(renders).toBe(1);
  });

  it('reflects the last state onto a re-bound element after unbind (remount)', () => {
    const container = ensureContainer('cg-remount');
    const first = fakeElement();
    const second = fakeElement();
    const dom = fragment();

    container.setState({ status: 'rendered', dom });
    container.bindElement(first as never);
    container.unbindElement(first as never);
    container.bindElement(second as never);

    expect(second.calls).toContain('rendered');
    expect(second.lastPanelDom).toBe(dom);
  });

  it('falls back to a superseded still-bound element on unbind of the active one', () => {
    const container = ensureContainer('cg-collision');
    const first = fakeElement();
    const second = fakeElement();
    container.setState({ status: 'rendered', dom: fragment() });
    container.bindElement(first as never); // first bound
    container.bindElement(second as never); // second supersedes

    container.unbindElement(second as never); // second leaves; first is still alive

    // first is now active again and reflects current state
    container.setState({ status: 'error' });

    expect(first.calls).toContain('hidden');
  });

  it('unbindElement ignores an element that is not the bound one', () => {
    const container = ensureContainer('cg-unbind-guard');
    const bound = fakeElement();
    const other = fakeElement();
    container.bindElement(bound as never);

    container.unbindElement(other as never);
    container.setState({ status: 'error' });

    expect(bound.calls).toContain('hidden');
  });
});

describe('container: selection', () => {
  it('round-trips the selection value', () => {
    const container = ensureContainer('cg-selection');

    container.setSelection('plan-a');

    expect(container.getSelection()).toBe('plan-a');
  });

  it('reset (setSelection null) clears the value', () => {
    const container = ensureContainer('cg-selection-reset');
    container.setSelection('plan-a');

    container.setSelection(null);

    expect(container.getSelection()).toBeNull();
  });

  it('applies the selection to a bound element', () => {
    const container = ensureContainer('cg-selection-apply');
    const el = fakeElement();
    container.bindElement(el as never);

    container.setSelection('plan-b');

    expect(el.lastSelection).toEqual(['plan-b']);
  });

  it('setRequired flags the element as required', () => {
    const container = ensureContainer('cg-required');
    const el = fakeElement();
    container.bindElement(el as never);

    container.setRequired();

    expect(el.lastRequired).toBe(true);
  });

  it('a selection clears the required flag', () => {
    const container = ensureContainer('cg-required-clear');
    const el = fakeElement();
    container.bindElement(el as never);
    container.setRequired();

    container.setSelection('plan-a');

    expect(el.lastRequired).toBe(false);
  });

  describe('setRequired while an option is selected', () => {
    function bound(key: string) {
      const container = ensureContainer(key);
      const el = fakeElement();
      container.bindElement(el as never);

      return { container, el };
    }

    it('is ignored after setSelection and keeps the selection', () => {
      const { container, el } = bound('cg-required-after-set');
      container.setSelection('plan-a');

      container.setRequired();

      expect(el.lastRequired).toBe(false);
      expect(container.getSelection()).toBe('plan-a');
    });

    it('is ignored after a user selection', () => {
      const { container, el } = bound('cg-required-after-user');
      container.handleUserSelection(['q1'], 'plan-a');

      container.setRequired();

      expect(el.lastRequired).toBe(false);
    });

    it('is ignored after a decline', () => {
      const { container, el } = bound('cg-required-after-decline');
      container.handleDecline('opt_out');

      container.setRequired();

      expect(el.lastRequired).toBe(false);
    });

    it('is ignored after a multiple-selection toggle selects an option', () => {
      const { container, el } = bound('cg-required-after-toggle');
      container.handleUserToggle(['q1'], 'a', undefined);

      container.setRequired();

      expect(el.lastRequired).toBe(false);
    });

    it('applies again once the last selected option is toggled off', () => {
      const { container, el } = bound('cg-required-toggle-off');
      container.handleUserToggle(['q1'], 'a', undefined);
      container.handleUserToggle(['q1'], 'a', undefined);

      expect(container.getAllSelections()).toEqual([]);

      container.setRequired();

      expect(el.lastRequired).toBe(true);
    });

    it('applies again after reset', () => {
      const { container, el } = bound('cg-required-after-reset');
      container.setSelection('plan-a');
      container.setSelection(null);

      container.setRequired();

      expect(el.lastRequired).toBe(true);
    });

    it('does nothing after unmount', () => {
      const { container, el } = bound('cg-required-after-unmount');
      container.unmount();
      el.lastRequired = undefined;

      container.setRequired();

      expect(el.lastRequired).toBeUndefined();
    });
  });
});

describe('container: event routing (In to Out)', () => {
  it('routes an emitted event to the registered handler', () => {
    const container = ensureContainer('cg-emit');
    const handler = vi.fn();
    const detail = { selectedOption: 'a', selectedProductIDs: ['1'] };

    container.setHandler('change', handler);
    container.emit('change', detail);

    expect(handler).toHaveBeenCalledWith(detail);
  });

  it('emitting an event with no handler is a no-op (does not throw)', () => {
    const container = ensureContainer('cg-emit-nohandler');

    expect(() => container.emit('change', { selectedOption: 'a', selectedProductIDs: [] })).not.toThrow();
  });

  it('single slot per event: a later handler replaces the earlier one', () => {
    const container = ensureContainer('cg-last-wins');
    const first = vi.fn();
    const second = vi.fn();
    const detail = { selectedOption: 'b', selectedProductIDs: ['2'] };

    container.setHandler('change', first);
    container.setHandler('change', second);
    container.emit('change', detail);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(detail);
  });

  it('setError emits the error event and hides the element', () => {
    const container = ensureContainer('cg-set-error');
    const el = fakeElement();
    const handler = vi.fn();
    const detail = { code: 'BAD_PRESENTATION', message: 'unknown layout' };
    container.bindElement(el as never);
    container.setHandler('error', handler);

    container.setError(detail);

    expect(handler).toHaveBeenCalledWith(detail);
    expect(el.calls).toContain('hidden');
  });

  it('emits error only on entering the error state, not per repeated setError', () => {
    const container = ensureContainer('cg-set-error-once');
    const el = fakeElement();
    const handler = vi.fn();
    const detail = { code: 'BAD_PRESENTATION', message: 'unknown layout' };
    container.bindElement(el as never);
    container.setHandler('error', handler);

    container.setError(detail);
    container.setError(detail);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('re-emits error after recovering from the error state', () => {
    const container = ensureContainer('cg-set-error-recover');
    const el = fakeElement();
    const handler = vi.fn();
    const detail = { code: 'BAD_PRESENTATION', message: 'unknown layout' };
    container.bindElement(el as never);
    container.setHandler('error', handler);

    container.setError(detail);
    container.setState({ status: 'rendered', dom: fragment() });
    container.setError(detail);

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('a handler survives repeated state changes on the same container', () => {
    const container = ensureContainer('cg-handler-survives');
    const el = fakeElement();
    const handler = vi.fn();
    const detail = { selectedOption: 'c', selectedProductIDs: ['3'] };

    container.setHandler('change', handler);
    container.bindElement(el as never);
    container.setState({ status: 'rendered', dom: fragment() });
    container.setState({ status: 'rendered', dom: fragment() });

    container.emit('change', detail);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(detail);
  });
});

describe('container: user interaction (In to Out)', () => {
  it('handleUserSelection updates selection and emits change with the quote ids', () => {
    const container = ensureContainer('cg-user-select');
    const handler = vi.fn();
    container.setHandler('change', handler);

    container.handleUserSelection(['q1', 'q2'], 'plan-a');

    expect(container.getSelection()).toBe('plan-a');
    expect(handler).toHaveBeenCalledWith({ selectedOption: 'plan-a', selectedProductIDs: ['q1', 'q2'] });
  });

  it('handleUserSelection clears a pending required flag', () => {
    const container = ensureContainer('cg-user-select-required');
    const el = fakeElement();
    container.bindElement(el as never);
    container.setRequired();

    container.handleUserSelection(['q1'], 'plan-a');

    expect(el.lastRequired).toBe(false);
  });

  it('handleUserSelection with no product ids is a no-op: no change, selection stays null', () => {
    const container = ensureContainer('cg-user-select-empty');
    const handler = vi.fn();
    container.setHandler('change', handler);

    container.handleUserSelection([], '');

    expect(handler).not.toHaveBeenCalled();
    expect(container.getSelection()).toBeNull();
  });

  it('handleDecline updates selection and emits change with empty ids and declined:true', () => {
    const container = ensureContainer('cg-user-decline');
    const handler = vi.fn();
    container.setHandler('change', handler);

    container.handleDecline('no-cover');

    expect(container.getSelection()).toBe('no-cover');
    expect(handler).toHaveBeenCalledWith({ selectedOption: 'no-cover', selectedProductIDs: [], declined: true });
  });

  it('handleDecline clears a pending required flag', () => {
    const container = ensureContainer('cg-user-decline-required');
    const el = fakeElement();
    container.bindElement(el as never);
    container.setRequired();

    container.handleDecline('no-cover');

    expect(el.lastRequired).toBe(false);
  });

  it('programmatic setSelection reflects state but emits no change (user-only rule)', () => {
    const container = ensureContainer('cg-set-no-change');
    const el = fakeElement();
    const handler = vi.fn();
    container.bindElement(el as never);
    container.setHandler('change', handler);

    container.setSelection('plan-a');

    expect(container.getSelection()).toBe('plan-a');
    expect(el.lastSelection).toEqual(['plan-a']);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('container: multiple selection', () => {
  function bound(key: string) {
    const container = ensureContainer(key);
    const el = fakeElement();
    const handler = vi.fn();
    container.bindElement(el as never);
    container.setHandler('change', handler);

    return { container, el, handler };
  }

  it('accumulates toggled options and emits the union of their quote ids', () => {
    const { container, el, handler } = bound('cg-multi-add');

    container.handleUserToggle(['q1'], 'opt_in_1');
    container.handleUserToggle(['q2'], 'opt_in_2');

    expect(el.lastSelection).toEqual(['opt_in_1', 'opt_in_2']);
    expect(handler).toHaveBeenLastCalledWith({ selectedOption: 'opt_in_2', selectedProductIDs: ['q1', 'q2'] });
  });

  it('deselects a toggled option that is already selected', () => {
    const { container, el, handler } = bound('cg-multi-remove');
    container.handleUserToggle(['q1'], 'opt_in_1');
    container.handleUserToggle(['q2'], 'opt_in_2');

    container.handleUserToggle(['q1'], 'opt_in_1');

    expect(el.lastSelection).toEqual(['opt_in_2']);
    expect(handler).toHaveBeenLastCalledWith({ selectedOption: 'opt_in_1', selectedProductIDs: ['q2'] });
  });

  it('emits an empty id list when the last option is deselected', () => {
    const { container, handler } = bound('cg-multi-empty');
    container.handleUserToggle(['q1'], 'opt_in_1');

    container.handleUserToggle(['q1'], 'opt_in_1');

    expect(handler).toHaveBeenLastCalledWith({ selectedOption: 'opt_in_1', selectedProductIDs: [] });
  });

  it('a decline replaces every selected option', () => {
    const { container, el } = bound('cg-multi-decline');
    container.handleUserToggle(['q1'], 'opt_in_1');
    container.handleUserToggle(['q2'], 'opt_in_2');

    container.handleDecline('opt_out');

    expect(el.lastSelection).toEqual(['opt_out']);
  });

  it('toggling an option drops a standing decline', () => {
    const { container, el } = bound('cg-multi-undecline');
    container.handleDecline('opt_out');

    container.handleUserToggle(['q1'], 'opt_in_1');

    expect(el.lastSelection).toEqual(['opt_in_1']);
  });

  it('rejects a selection beyond maxSelect: no change, state unchanged, DOM repainted', () => {
    const { container, el, handler } = bound('cg-multi-max');
    container.handleUserToggle(['q1'], 'opt_in_1', 2);
    container.handleUserToggle(['q2'], 'opt_in_2', 2);
    el.lastSelection = undefined;
    handler.mockClear();

    container.handleUserToggle(['q3'], 'opt_in_3', 2);

    expect(handler).not.toHaveBeenCalled();
    expect(el.lastSelection).toEqual(['opt_in_1', 'opt_in_2']);
  });

  it('still allows deselecting when the cap is reached', () => {
    const { container, el } = bound('cg-multi-max-deselect');
    container.handleUserToggle(['q1'], 'opt_in_1', 1);

    container.handleUserToggle(['q1'], 'opt_in_1', 1);

    expect(el.lastSelection).toEqual([]);
  });

  it('getSelection reports the most recently selected option', () => {
    const { container } = bound('cg-multi-get');
    container.handleUserToggle(['q1'], 'opt_in_1');
    container.handleUserToggle(['q2'], 'opt_in_2');

    expect(container.getSelection()).toBe('opt_in_2');
  });

  it('getAllSelections returns every selected option id in selection order', () => {
    const { container } = bound('cg-multi-getall');
    container.handleUserToggle(['q1'], 'opt_in_1');
    container.handleUserToggle(['q2'], 'opt_in_2');

    expect(container.getAllSelections()).toEqual(['opt_in_1', 'opt_in_2']);
  });

  it('getAllSelections drops a deselected option and keeps the rest in order', () => {
    const { container } = bound('cg-multi-getall-deselect');
    container.handleUserToggle(['q1'], 'opt_in_1');
    container.handleUserToggle(['q2'], 'opt_in_2');

    container.handleUserToggle(['q1'], 'opt_in_1');

    expect(container.getAllSelections()).toEqual(['opt_in_2']);
  });

  it('getAllSelections orders a re-selected option after the others', () => {
    const { container } = bound('cg-multi-getall-reselect');
    container.handleUserToggle(['q1'], 'opt_in_1');
    container.handleUserToggle(['q2'], 'opt_in_2');
    container.handleUserToggle(['q1'], 'opt_in_1');

    container.handleUserToggle(['q1'], 'opt_in_1');

    expect(container.getAllSelections()).toEqual(['opt_in_2', 'opt_in_1']);
  });

  it('getAllSelections returns [] when nothing is selected', () => {
    const { container } = bound('cg-getall-empty');

    expect(container.getAllSelections()).toEqual([]);
  });

  it('getAllSelections returns the decline id after a decline, and replaces a prior selection', () => {
    const { container } = bound('cg-getall-decline');
    container.handleUserToggle(['q1'], 'opt_in_1');

    container.handleDecline('opt_out');

    expect(container.getAllSelections()).toEqual(['opt_out']);
  });

  it('getAllSelections returns a copy, so mutating the result cannot corrupt state', () => {
    const { container } = bound('cg-getall-copy');
    container.handleUserToggle(['q1'], 'opt_in_1');

    container.getAllSelections().push('rogue');

    expect(container.getAllSelections()).toEqual(['opt_in_1']);
  });

  it('getAllSelections is a 0- or 1-element array in a single-select flow, consistent with getSelection', () => {
    const { container } = bound('cg-getall-single');

    container.handleUserSelection(['q1'], 'opt_in_1');
    container.handleUserSelection(['q2'], 'opt_in_2');

    expect(container.getAllSelections()).toEqual(['opt_in_2']);
    expect(container.getSelection()).toBe('opt_in_2');
  });

  it('getAllSelections reflects setSelection and a null reset', () => {
    const { container } = bound('cg-getall-set');

    container.setSelection('plan-a');
    expect(container.getAllSelections()).toEqual(['plan-a']);

    container.setSelection(null);
    expect(container.getAllSelections()).toEqual([]);
  });

  it('getAllSelections is empty after unmount', () => {
    const { container } = bound('cg-getall-unmount');
    container.handleUserToggle(['q1'], 'opt_in_1');

    container.unmount();

    expect(container.getAllSelections()).toEqual([]);
  });

  it('setSelection replaces a multiple selection with the single option', () => {
    const { container, el } = bound('cg-multi-set');
    container.handleUserToggle(['q1'], 'opt_in_1');
    container.handleUserToggle(['q2'], 'opt_in_2');

    container.setSelection('opt_in_2');

    expect(el.lastSelection).toEqual(['opt_in_2']);
  });

  it('ignores a toggle with no quote ids and repaints the DOM', () => {
    const { container, el, handler } = bound('cg-multi-noids');

    container.handleUserToggle([], 'opt_in_1');

    expect(handler).not.toHaveBeenCalled();
    expect(el.lastSelection).toEqual([]);
  });
});

describe('container: ready event', () => {
  it('emits ready once, on the first rendered state only', () => {
    const container = ensureContainer('cg-ready');
    const handler = vi.fn();
    container.setHandler('ready', handler);

    container.setState({ status: 'rendered', dom: fragment() });
    container.setState({ status: 'loading' });
    container.setState({ status: 'rendered', dom: fragment() });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(undefined);
  });

  it('does not emit ready for loading or error states', () => {
    const container = ensureContainer('cg-ready-not');
    const handler = vi.fn();
    container.setHandler('ready', handler);

    container.setState({ status: 'loading' });
    container.setState({ status: 'error' });

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('container: unmount', () => {
  it('removes the container from the registry', () => {
    const container = ensureContainer('cg-unmount');

    container.unmount();

    expect(getContainer('cg-unmount')).toBeUndefined();
  });

  it('a later ensureContainer for the same key creates a fresh container', () => {
    const first = ensureContainer('cg-unmount-fresh');

    first.unmount();

    const second = ensureContainer('cg-unmount-fresh');

    expect(second).not.toBe(first);
  });

  it('blanks a still-bound element and clears handlers', () => {
    const container = ensureContainer('cg-unmount-blank');
    const el = fakeElement();
    const handler = vi.fn();
    container.bindElement(el as never);
    container.setState({ status: 'rendered', dom: fragment() });
    container.setSelection('plan-a');
    container.setHandler('change', handler);

    container.unmount();

    expect(el.calls).toContain('hidden');
    expect(el.lastSelection).toEqual([]);
    expect(el.lastRequired).toBe(false);

    container.emit('change', { selectedOption: 'a', selectedProductIDs: [] });
    expect(handler).not.toHaveBeenCalled();
  });

  it('a stale client render() after unmount is a no-op, not a silent write', () => {
    const container = ensureContainer('cg-unmount-stale');
    const el = fakeElement();
    container.bindElement(el as never);
    container.unmount();
    el.calls.length = 0;

    container.setResponse({} as never);

    expect(el.calls).toEqual([]);
    expect(getContainer('cg-unmount-stale')).toBeUndefined();
  });
});

describe('container: setResponse without a registered context', () => {
  afterEach(() => {
    clearContainers();
    clearContexts();
  });

  const offer = {
    id: 'o1',
    offer_config_id: 'oc1',
    offer_schema: 'schema-1',
    currency: 'USD',
    products: [],
    content: {},
    presentation: {},
  };

  it('emits a not_registered error instead of throwing', () => {
    clearContexts();
    const container = ensureContainer('cg-no-context');
    const handler = vi.fn();
    container.setHandler('error', handler);

    expect(() => container.setResponse(offer as never)).not.toThrow();
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ code: 'not_registered' }));
  });
});
