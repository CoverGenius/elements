import { describe, expect, it, vi, type Mock } from 'vitest';
import { bindInteraction, type InteractionSink } from '../resolver/interaction';

// The delegated listener is exercised against hand-built DOM, no element or shadow
// root: it is a pure reader of the data-cg-* hooks a builder stamps. A stub sink
// records the semantic intents; reactions are asserted on the DOM directly.

function sink(): InteractionSink & {
  select: Mock<InteractionSink['select']>;
  toggle: Mock<InteractionSink['toggle']>;
  decline: Mock<InteractionSink['decline']>;
} {
  return { select: vi.fn(), toggle: vi.fn(), decline: vi.fn() };
}

function root(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

function click(el: Element | null): void {
  el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function change(el: Element | null): void {
  el?.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('bindInteraction: selection and decline', () => {
  it('translates an option click into a select intent with its option id and quote ids', () => {
    const r = root('<button data-cg-role="option" data-cg-option-id="opt_in_1" data-cg-product-ids="q1">Add</button>');
    const s = sink();
    bindInteraction(r, s);

    click(r.querySelector('[data-cg-role="option"]'));

    expect(s.select).toHaveBeenCalledWith(['q1'], 'opt_in_1');
  });

  it('passes every quote id of an aggregated option', () => {
    const r = root(
      '<button data-cg-role="option" data-cg-option-id="opt_in_1" data-cg-product-ids="q1 q2 q3">Add</button>',
    );
    const s = sink();
    bindInteraction(r, s);

    click(r.querySelector('[data-cg-role="option"]'));

    expect(s.select).toHaveBeenCalledWith(['q1', 'q2', 'q3'], 'opt_in_1');
  });

  it('reads the option id only from data-cg-option-id, never from the quote ids', () => {
    const r = root('<button data-cg-role="option" data-cg-product-ids="q1 q2">Add</button>');
    const s = sink();
    bindInteraction(r, s);

    click(r.querySelector('[data-cg-role="option"]'));

    expect(s.select).toHaveBeenCalledWith(['q1', 'q2'], '');
  });

  it('translates a selection-control change into a select intent, resolved to its option', () => {
    const r = root(
      '<label data-cg-role="option" data-cg-option-id="opt_in_1" data-cg-product-ids="q1"><input type="radio" data-cg-role="selection-control" /></label>',
    );
    const s = sink();
    bindInteraction(r, s);

    change(r.querySelector('[data-cg-role="selection-control"]'));

    expect(s.select).toHaveBeenCalledWith(['q1'], 'opt_in_1');
  });

  it('translates a control-less decline click into a decline intent, never a select', () => {
    const r = root('<button data-cg-role="decline" data-cg-product-ids="">No thanks</button>');
    const s = sink();
    bindInteraction(r, s);

    click(r.querySelector('[data-cg-role="decline"]'));

    expect(s.decline).toHaveBeenCalledTimes(1);
    expect(s.select).not.toHaveBeenCalled();
  });

  it('routes a selection-control change inside a decline wrapper to decline, not select', () => {
    const r = root(
      '<label data-cg-role="decline" data-cg-product-ids=""><input type="radio" data-cg-role="selection-control" /></label>',
    );
    const s = sink();
    bindInteraction(r, s);

    change(r.querySelector('[data-cg-role="selection-control"]'));

    expect(s.decline).toHaveBeenCalledTimes(1);
    expect(s.select).not.toHaveBeenCalled();
  });

  it('resolves the decline option id from an explicit data-cg-option-id', () => {
    const r = root(
      '<button data-cg-role="decline" data-cg-option-id="no-cover" data-cg-product-ids="">No thanks</button>',
    );
    const s = sink();
    bindInteraction(r, s);

    click(r.querySelector('[data-cg-role="decline"]'));

    expect(s.decline).toHaveBeenCalledWith('no-cover');
  });

  it('does not double-select when a control nested in an option label is clicked', () => {
    const r = root(
      '<label data-cg-role="option" data-cg-option-id="opt_in_1" data-cg-product-ids="q1"><input type="radio" data-cg-role="selection-control" /></label>',
    );
    const s = sink();
    bindInteraction(r, s);

    // A label click activates the control: the browser fires a click on the label
    // and a change on the control. Only the change drives selection, so it fires once.
    click(r.querySelector('[data-cg-role="option"]'));
    change(r.querySelector('[data-cg-role="selection-control"]'));

    expect(s.select).toHaveBeenCalledTimes(1);
    expect(s.select).toHaveBeenCalledWith(['q1'], 'opt_in_1');
  });

  it('selects a control-less option on click', () => {
    const r = root('<button data-cg-role="option" data-cg-option-id="opt_in_1" data-cg-product-ids="q1">Add</button>');
    const s = sink();
    bindInteraction(r, s);

    click(r.querySelector('[data-cg-role="option"]'));

    expect(s.select).toHaveBeenCalledWith(['q1'], 'opt_in_1');
  });

  it('translates a submit-role CTA click into a select intent', () => {
    const r = root('<button data-cg-role="submit" data-cg-option-id="opt_in_1" data-cg-product-ids="q1">Buy</button>');
    const s = sink();
    bindInteraction(r, s);

    click(r.querySelector('[data-cg-role="submit"]'));

    expect(s.select).toHaveBeenCalledWith(['q1'], 'opt_in_1');
  });

  it('routes a submit CTA inside an option to select, resolved to its option', () => {
    const r = root(
      '<div data-cg-role="option" data-cg-option-id="opt_in_1" data-cg-product-ids="q1"><button data-cg-role="submit" data-cg-option-id="opt_in_1" data-cg-product-ids="q1">Add cover</button></div>',
    );
    const s = sink();
    bindInteraction(r, s);

    click(r.querySelector('button'));

    expect(s.select).toHaveBeenCalledWith(['q1'], 'opt_in_1');
  });

  it('does not select a CTA-controlled option when the click lands outside its submit button', () => {
    const r = root(
      '<div data-cg-role="option" data-cg-option-id="opt_in_1" data-cg-product-ids="q1">' +
        '<span class="label">Standard</span>' +
        '<button data-cg-role="submit" data-cg-option-id="opt_in_1" data-cg-product-ids="q1">Add cover</button>' +
        '</div>',
    );
    const s = sink();
    bindInteraction(r, s);

    click(r.querySelector('.label'));

    expect(s.select).not.toHaveBeenCalled();
  });

  it('does not decline a CTA-controlled decline option when the click lands outside its button', () => {
    const r = root(
      '<div data-cg-role="decline" data-cg-option-id="opt_out" data-cg-product-ids="">' +
        '<span class="label">No thanks</span>' +
        '<button data-cg-role="decline" data-cg-option-id="opt_out" data-cg-product-ids="">Decline</button>' +
        '</div>',
    );
    const s = sink();
    bindInteraction(r, s);

    click(r.querySelector('.label'));

    expect(s.decline).not.toHaveBeenCalled();
  });

  it('finds the hook when the click lands on a child of the interactive element', () => {
    const r = root(
      '<button data-cg-role="option" data-cg-option-id="opt_in_1" data-cg-product-ids="q1"><span>Add</span></button>',
    );
    const s = sink();
    bindInteraction(r, s);

    click(r.querySelector('span'));

    expect(s.select).toHaveBeenCalledWith(['q1'], 'opt_in_1');
  });

  it('ignores a click on an element carrying no hook', () => {
    const r = root('<p>disclaimer</p>');
    const s = sink();
    bindInteraction(r, s);

    click(r.querySelector('p'));

    expect(s.select).not.toHaveBeenCalled();
  });

  it('reports an empty id list for an option with no product ids', () => {
    const r = root('<button data-cg-role="option">Add</button>');
    const s = sink();
    bindInteraction(r, s);

    click(r.querySelector('[data-cg-role="option"]'));

    expect(s.select).toHaveBeenCalledWith([], '');
  });
});

describe('bindInteraction: multiple selection group', () => {
  const group = (max = '') =>
    '<div data-cg-select-mode="multiple"' +
    (max ? ` data-cg-max-select="${max}"` : '') +
    '>' +
    '<div data-cg-role="option" data-cg-option-id="opt_in_1" data-cg-product-ids="q1"><input type="checkbox" data-cg-role="selection-control"></div>' +
    '<div data-cg-role="option" data-cg-option-id="opt_in_2" data-cg-product-ids="q2"><button data-cg-role="submit" data-cg-option-id="opt_in_2" data-cg-product-ids="q2">Add</button></div>' +
    '<div data-cg-role="decline" data-cg-option-id="opt_out"><input type="radio" data-cg-role="selection-control"></div>' +
    '</div>';

  it('routes a checkbox change to toggle, never select', () => {
    const r = root(group());
    const s = sink();
    bindInteraction(r, s);

    change(r.querySelector('input[type="checkbox"]'));

    expect(s.toggle).toHaveBeenCalledWith(['q1'], 'opt_in_1', undefined);
    expect(s.select).not.toHaveBeenCalled();
  });

  it('routes a CTA click to toggle', () => {
    const r = root(group());
    const s = sink();
    bindInteraction(r, s);

    click(r.querySelector('[data-cg-role="submit"]'));

    expect(s.toggle).toHaveBeenCalledWith(['q2'], 'opt_in_2', undefined);
  });

  it('passes the group max_select cap to the toggle', () => {
    const r = root(group('2'));
    const s = sink();
    bindInteraction(r, s);

    change(r.querySelector('input[type="checkbox"]'));

    expect(s.toggle).toHaveBeenCalledWith(['q1'], 'opt_in_1', 2);
  });

  it('still routes the decline control to decline', () => {
    const r = root(group());
    const s = sink();
    bindInteraction(r, s);

    change(r.querySelector('input[type="radio"]'));

    expect(s.decline).toHaveBeenCalledWith('opt_out');
    expect(s.toggle).not.toHaveBeenCalled();
  });

  it('leaves an exclusive group on select', () => {
    const r = root(group().replace(' data-cg-select-mode="multiple"', ''));
    const s = sink();
    bindInteraction(r, s);

    change(r.querySelector('input[type="checkbox"]'));

    expect(s.select).toHaveBeenCalledWith(['q1'], 'opt_in_1');
    expect(s.toggle).not.toHaveBeenCalled();
  });
});

describe('bindInteraction: product_rules reactions (in place)', () => {
  const withTarget = (action: string, targetHtml: string) =>
    root(
      `<button data-cg-role="decline" data-cg-target-rule="cfar" data-cg-target-action="${action}">No thanks</button>` +
        targetHtml,
    );

  it('reveals a hidden target group on a show reaction', () => {
    const r = withTarget('show', '<div data-cg-rule="cfar" hidden><input /></div>');
    bindInteraction(r, sink());

    click(r.querySelector('[data-cg-role="decline"]'));

    expect(r.querySelector('[data-cg-rule="cfar"]')?.hasAttribute('hidden')).toBe(false);
  });

  it('hides a visible target group on a hide reaction', () => {
    const r = withTarget('hide', '<div data-cg-rule="cfar"><input /></div>');
    bindInteraction(r, sink());

    click(r.querySelector('[data-cg-role="decline"]'));

    expect(r.querySelector('[data-cg-rule="cfar"]')?.hasAttribute('hidden')).toBe(true);
  });

  it('disables the controls in a target group on a disable reaction', () => {
    const r = withTarget('disable', '<div data-cg-rule="cfar"><input /></div>');
    bindInteraction(r, sink());

    click(r.querySelector('[data-cg-role="decline"]'));

    const target = r.querySelector<HTMLElement>('[data-cg-rule="cfar"]');
    expect(target?.hasAttribute('data-cg-disabled')).toBe(true);
    expect(target?.getAttribute('aria-disabled')).toBe('true');
    expect(target?.querySelector('input')?.disabled).toBe(true);
  });

  it('re-enables the controls in a target group on an enable reaction', () => {
    const r = withTarget('enable', '<div data-cg-rule="cfar" data-cg-disabled><input disabled /></div>');
    bindInteraction(r, sink());

    click(r.querySelector('[data-cg-role="decline"]'));

    const target = r.querySelector<HTMLElement>('[data-cg-rule="cfar"]');
    expect(target?.hasAttribute('data-cg-disabled')).toBe(false);
    expect(target?.hasAttribute('aria-disabled')).toBe(false);
    expect(target?.querySelector('input')?.disabled).toBe(false);
  });

  it('toggles the target group in place: the target node keeps its identity (no rebuild)', () => {
    const r = withTarget('show', '<div data-cg-rule="cfar" hidden><input /></div>');
    const before = r.querySelector('[data-cg-rule="cfar"]');
    bindInteraction(r, sink());

    click(r.querySelector('[data-cg-role="decline"]'));

    expect(r.querySelector('[data-cg-rule="cfar"]')).toBe(before);
  });

  it('is a logged no-op when the target group is absent', () => {
    const logger = { debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const r = withTarget('show', '');
    bindInteraction(r, sink(), logger);

    expect(() => click(r.querySelector('[data-cg-role="decline"]'))).not.toThrow();
    expect(logger.debug).toHaveBeenCalled();
  });

  it('is a logged no-op for an unrecognised action', () => {
    const logger = { debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const r = root(
      '<button data-cg-role="decline" data-cg-target-rule="cfar" data-cg-target-action="explode">x</button>' +
        '<div data-cg-rule="cfar"></div>',
    );
    bindInteraction(r, sink(), logger);

    click(r.querySelector('[data-cg-role="decline"]'));

    expect(logger.debug).toHaveBeenCalled();
  });

  it('escapes a slug so it cannot break the target selector', () => {
    const r = root(
      '<button data-cg-role="decline" data-cg-target-rule="a&quot;b" data-cg-target-action="hide">x</button>' +
        '<div data-cg-rule="a&quot;b"></div>',
    );
    bindInteraction(r, sink());

    click(r.querySelector('[data-cg-role="decline"]'));

    expect(r.querySelector('[data-cg-rule]')?.hasAttribute('hidden')).toBe(true);
  });
});

describe('bindInteraction: delegation survives a rebuild', () => {
  it('fires for children swapped in under the stable root after binding', () => {
    const r = root('');
    const s = sink();
    bindInteraction(r, s);

    // The panel content is replaced beneath the root the listener is bound to.
    r.replaceChildren();
    const rebuilt = document.createElement('button');
    rebuilt.dataset.cgRole = 'option';
    rebuilt.dataset.cgOptionId = 'opt_in_9';
    rebuilt.dataset.cgProductIds = 'q9';
    r.append(rebuilt);

    click(rebuilt);

    expect(s.select).toHaveBeenCalledWith(['q9'], 'opt_in_9');
  });
});
