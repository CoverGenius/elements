import type { Logger } from '../shared/context';
import { CG_ATTR, CG_ROLE, attrSelector, type CgRole } from '../shared/attributes';
import { parseProductIds } from '../core/selection-dom';
import type { SelectionEvent } from '../shared/types';

export interface InteractionSink {
  select(productIds: string[], optionId: string): void;
  toggle(productIds: string[], optionId: string, maxSelect?: number): void;
  decline(optionId: string): void;
}

type ReactionAction = SelectionEvent['action'];

const REACTION_ACTION: ReadonlySet<string> = new Set<ReactionAction>(['show', 'hide', 'enable', 'disable']);

const HOOK_SELECTOR = `${attrSelector(CG_ATTR.role)}, ${attrSelector(CG_ATTR.targetRule)}`;

// A card whose control is a CTA button carries no radio/checkbox: its dedicated control is
// the submit/decline button itself. Either kind of descendant means the option/decline panel
// already has a specific click target of its own, so a click elsewhere on the panel (blank
// space, label text, badge, etc.) must not also fire selection.
const DEDICATED_CONTROL_SELECTOR = [
  attrSelector(CG_ATTR.role, CG_ROLE.selectionControl),
  attrSelector(CG_ATTR.role, CG_ROLE.submit),
  attrSelector(CG_ATTR.role, CG_ROLE.decline),
].join(', ');

/**
 * Installs the delegated listener on the panel root. The root outlives every
 * re-render (its content is swapped beneath it), so this is called once and
 * never rebound.
 */
export function bindInteraction(root: HTMLElement, sink: InteractionSink, logger?: Logger): void {
  root.addEventListener('change', (event) => {
    const control = closestRole(event.target, CG_ROLE.selectionControl);

    if (!control) return;

    const decline = declineAncestor(control);

    if (decline) sink.decline(optionId(decline));
    else select(control, sink);
  });

  root.addEventListener('click', (event) => {
    const trigger = closestHook(event.target);

    if (!trigger) return;

    const reaction = trigger.getAttribute(CG_ATTR.targetRule);

    if (reaction) applyReaction(root, reaction, trigger.getAttribute(CG_ATTR.targetAction), logger);

    const role = trigger.getAttribute(CG_ATTR.role);

    const hasControl = !!trigger.querySelector(DEDICATED_CONTROL_SELECTOR);

    if (role === CG_ROLE.submit) select(trigger, sink);
    else if (role === CG_ROLE.decline && !hasControl) sink.decline(optionId(trigger));
    else if (role === CG_ROLE.option && !hasControl) select(trigger, sink);
  });
}

function declineAncestor(el: HTMLElement): HTMLElement | null {
  return el.closest<HTMLElement>(attrSelector(CG_ATTR.role, CG_ROLE.decline));
}

/** A missing target or unrecognised action is a logged no-op, never a throw */
function applyReaction(root: HTMLElement, slug: string, action: string | null, logger?: Logger): void {
  if (!action || !REACTION_ACTION.has(action)) {
    logger?.debug('interaction: unknown reaction action', { slug, action });

    return;
  }

  const target = findTarget(root, slug);

  if (!target) {
    logger?.debug('interaction: reaction target not found', { slug, action });

    return;
  }

  switch (action as ReactionAction) {
    case 'show':
      target.removeAttribute('hidden');

      break;
    case 'hide':
      target.setAttribute('hidden', '');

      break;
    case 'enable':
      setDisabled(target, false);

      break;
    case 'disable':
      setDisabled(target, true);

      break;
  }
}

function setDisabled(target: HTMLElement, disabled: boolean): void {
  target.toggleAttribute(CG_ATTR.disabled, disabled);

  if (disabled) target.setAttribute('aria-disabled', 'true');
  else target.removeAttribute('aria-disabled');

  for (const control of target.querySelectorAll<HTMLInputElement | HTMLButtonElement>(
    'input, button, select, textarea',
  ))
    control.disabled = disabled;
}

function closestHook(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(HOOK_SELECTOR) : null;
}

function closestRole(target: EventTarget | null, role: CgRole): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(attrSelector(CG_ATTR.role, role)) : null;
}

function productIds(el: HTMLElement): string[] {
  return parseProductIds(el.getAttribute(CG_ATTR.productIds));
}

function select(el: HTMLElement, sink: InteractionSink): void {
  const option = el.closest<HTMLElement>(attrSelector(CG_ATTR.role, CG_ROLE.option)) ?? el;

  const group = option.closest<HTMLElement>(attrSelector(CG_ATTR.selectMode, 'multiple'));

  if (!group) {
    sink.select(productIds(option), optionId(option));

    return;
  }

  const max = Number(group.getAttribute(CG_ATTR.maxSelect));

  sink.toggle(productIds(option), optionId(option), max > 0 ? max : undefined);
}

function optionId(el: HTMLElement): string {
  return el.getAttribute(CG_ATTR.optionId) ?? '';
}

function findTarget(root: HTMLElement, slug: string): HTMLElement | null {
  for (const el of root.querySelectorAll<HTMLElement>(attrSelector(CG_ATTR.rule)))
    if (el.getAttribute(CG_ATTR.rule) === slug) return el;

  return null;
}
