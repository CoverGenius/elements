import { describe, expect, it } from 'vitest';
import { buildList } from '../components/list';
import type { ListItem } from '../components/list';
import { ICON_REGISTRY } from '../shared/icon-registry';
import { COMPONENT_STYLES } from '../styles/generated/component-styles.generated';

function item(text: string, icon?: string): ListItem {
  return { name: text.toLowerCase().replace(/\s+/g, '-'), text, icon };
}

// Routes the registry string through the same HTML parser so the comparison
// isn't tripped by serialization differences (e.g. self-closing path tags).
function renderedIcon(name: string): string {
  const div = document.createElement('div');
  div.innerHTML = ICON_REGISTRY[name] ?? '';
  return div.innerHTML;
}

describe('buildList', () => {
  const items = [item('Flight delay cover'), item('Lost baggage'), item('Medical expenses')];

  describe('default type', () => {
    it('renders a UL with tick-marked list items', () => {
      const el = buildList({ type: 'default', items });

      expect(el.tagName).toBe('UL');
      expect(el.className).toContain('cge-list-default');
      expect(el.children).toHaveLength(3);
    });

    it('each item has a tick span and text span', () => {
      const el = buildList({ type: 'default', items: [item('Cover A')] });
      const li = el.children[0];

      expect(li.children[0].getAttribute('aria-hidden')).toBe('true');
    });

    it('stamps data-cg-benefit-name from item.name', () => {
      const el = buildList({ type: 'default', items: [item('Cover A')] });
      const li = el.children[0] as HTMLElement;

      expect(li.dataset.cgBenefitName).toBe('cover-a');
    });

    it('tick spans use cge-list-tick class', () => {
      const el = buildList({ type: 'default', items: [item('A')] });
      const tick = el.children[0].children[0] as HTMLElement;

      expect(tick.className).toBe('cge-list-tick');
    });

    it('stylesheet defines --cge-benefit-tick-color', () => {
      expect(COMPONENT_STYLES).toContain('--cge-benefit-tick-color');
    });

    it('renders custom icon instead of tick when item.icon is set', () => {
      const el = buildList({ type: 'default', items: [item('A', 'shield')] });
      const li = el.children[0];
      const icon = li.querySelector('.cge-icon') as HTMLElement;

      expect(icon).not.toBeNull();
      expect(icon.dataset.cgIcon).toBe('shield');
      expect(li.querySelector('.cge-list-tick')).toBeNull();
    });

    it('renders tick when item.icon is undefined (no double bullets)', () => {
      const el = buildList({ type: 'default', items: [item('A')] });
      const li = el.children[0];

      expect(li.querySelector('.cge-list-tick')).not.toBeNull();
      expect(li.querySelector('.cge-icon')).toBeNull();
    });
  });

  describe('variant default icons', () => {
    it('benefits items keep the check tick', () => {
      const el = buildList({ type: 'default', items: [item('Cover A')], variant: 'benefits' });
      const tick = el.children[0].children[0] as HTMLElement;

      expect(tick.className).toBe('cge-list-tick');
      expect(tick.innerHTML).toBe(renderedIcon('check'));
    });

    it('inclusions items fall back to the plus icon', () => {
      const el = buildList({ type: 'default', items: [item('Cover A')], variant: 'inclusions' });
      const tick = el.children[0].children[0] as HTMLElement;

      expect(tick.className).toBe('cge-list-tick');
      expect(tick.innerHTML).toBe(renderedIcon('plus'));
    });

    it('exclusions items fall back to the close icon with the error-colour modifier', () => {
      const el = buildList({ type: 'default', items: [item('Cover A')], variant: 'exclusions' });
      const tick = el.children[0].children[0] as HTMLElement;

      expect(tick.className).toBe('cge-list-tick cge-list-tick-exclusion');
      expect(tick.innerHTML).toBe(renderedIcon('close'));
    });

    it('a per-item icon still wins over the variant default', () => {
      const el = buildList({ type: 'default', items: [item('A', 'shield')], variant: 'exclusions' });
      const li = el.children[0];

      expect(li.querySelector('.cge-icon')).not.toBeNull();
      expect(li.querySelector('.cge-list-tick')).toBeNull();
    });

    it('the exclusion modifier and plus/close icons exist in the stylesheet and registry', () => {
      expect(COMPONENT_STYLES).toContain('.cge-list-tick-exclusion');
      expect(COMPONENT_STYLES).toContain('var(--cge-error-color');
      expect(ICON_REGISTRY['plus']).toBeTruthy();
      expect(ICON_REGISTRY['close']).toBeTruthy();
    });
  });

  describe('pills type', () => {
    it('renders a DIV with pill spans', () => {
      const el = buildList({ type: 'pills', items });

      expect(el.tagName).toBe('DIV');
      expect(el.className).toContain('cge-list-pills');
      expect(el.children).toHaveLength(3);
    });

    it('each pill has the cge-list-pill class', () => {
      const el = buildList({ type: 'pills', items: [item('Benefit')] });
      const pill = el.children[0] as HTMLElement;

      expect(pill.className).toBe('cge-list-pill');
      expect(pill.style.length).toBe(0);
    });

    it('stylesheet defines --cge-benefit-pill-* variables with center alignment', () => {
      expect(COMPONENT_STYLES).toContain('--cge-benefit-pill-background-color');
      expect(COMPONENT_STYLES).toContain('--cge-benefit-pill-color');
      expect(COMPONENT_STYLES).toContain('--cge-benefit-pill-border-radius');
      expect(COMPONENT_STYLES).toContain('align-items: center');
    });
  });

  describe('panel type', () => {
    it('renders a UL with panel class', () => {
      const el = buildList({ type: 'panel', items });

      expect(el.tagName).toBe('UL');
      expect(el.className).toContain('cge-list-panel');
      expect(el.style.length).toBe(0);
    });

    it('renders panel items with title in a body container', () => {
      const el = buildList({ type: 'panel', items: [item('A')] });
      const li = el.children[0] as HTMLElement;

      expect(li.className).toBe('cge-list-panel-item');
      const body = li.querySelector('.cge-list-panel-body') as HTMLElement;
      expect(body).not.toBeNull();
      const title = body.querySelector('.cge-list-panel-title') as HTMLElement;
      expect(title.textContent).toBe('A');
    });
  });

  describe('timeline type', () => {
    it('renders a UL with dot-marked timeline items', () => {
      const el = buildList({ type: 'timeline', items });

      expect(el.tagName).toBe('UL');
      expect(el.className).toContain('cge-list-timeline');
      expect(el.children).toHaveLength(3);
    });

    it('each item has a dot and non-last items have a connecting line', () => {
      const el = buildList({ type: 'timeline', items: [item('A'), item('B')] });
      const firstLi = el.children[0] as HTMLElement;
      const lastLi = el.children[1] as HTMLElement;

      expect(firstLi.querySelector('.cge-list-timeline-dot')).not.toBeNull();
      expect(firstLi.querySelector('.cge-list-timeline-line')).not.toBeNull();
      expect(lastLi.querySelector('.cge-list-timeline-dot')).not.toBeNull();
      expect(lastLi.querySelector('.cge-list-timeline-line')).toBeNull();
    });

    it('last-child padding is handled by CSS, not inline styles', () => {
      const el = buildList({ type: 'timeline', items: [item('A'), item('B'), item('C')] });
      const last = el.children[2] as HTMLElement;

      expect(last.className).toContain('cge-list-timeline-item');
      expect(last.style.length).toBe(0);
      expect(COMPONENT_STYLES).toContain('.cge-list-timeline-item:last-child');
    });
  });

  it('renders an empty list when items is empty', () => {
    const el = buildList({ type: 'default', items: [] });

    expect(el.children).toHaveLength(0);
  });

  describe('heading slot', () => {
    it('wraps list in a container with heading when heading is provided', () => {
      const el = buildList({ type: 'default', items: [item('A')], heading: 'Benefits' });

      expect(el.className).toBe('cge-list-container');
      const h = el.querySelector('.cge-list-heading');
      expect(h).not.toBeNull();
      expect(h?.textContent).toBe('Benefits');
      expect(el.querySelector('.cge-list')).not.toBeNull();
    });

    it('returns the list directly when heading is not provided', () => {
      const el = buildList({ type: 'default', items: [item('A')] });

      expect(el.className).toContain('cge-list');
      expect(el.querySelector('.cge-list-container')).toBeNull();
    });
  });
});
