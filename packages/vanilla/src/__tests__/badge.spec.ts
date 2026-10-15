import { describe, expect, it } from 'vitest';
import { buildBadge } from '../components/badge';
import { COMPONENT_STYLES } from '../styles/generated/component-styles.generated';

describe('buildBadge', () => {
  it('renders a pill badge', () => {
    const el = buildBadge({ label: 'Popular', type: 'pill' });

    expect(el.tagName).toBe('SPAN');
    expect(el.textContent).toBe('Popular');
    expect(el.className).toContain('cge-badge-pill');
  });

  it('renders a default badge', () => {
    const el = buildBadge({ label: 'Best Value', type: 'default' });

    expect(el.className).toContain('cge-badge-default');
  });

  it('stamps data-cg-badge-location and location class when location is provided', () => {
    const start = buildBadge({ label: 'X', type: 'default', location: 'resting_start' });
    const center = buildBadge({ label: 'X', type: 'default', location: 'resting_center' });
    const end = buildBadge({ label: 'X', type: 'pill', location: 'resting_end' });

    expect(start.dataset.cgBadgeLocation).toBe('resting_start');
    expect(start.className).toContain('cge-badge-resting-start');
    expect(center.dataset.cgBadgeLocation).toBe('resting_center');
    expect(center.className).toContain('cge-badge-resting-center');
    expect(end.dataset.cgBadgeLocation).toBe('resting_end');
    expect(end.className).toContain('cge-badge-resting-end');
  });

  it('supports all canonical badge locations', () => {
    const locations = [
      'resting_start',
      'resting_center',
      'resting_end',
      'above',
      'below',
      'inline_start',
      'inline_end',
    ] as const;

    for (const loc of locations) {
      const el = buildBadge({ label: 'X', type: 'pill', location: loc });
      expect(el.dataset.cgBadgeLocation).toBe(loc);
    }
  });

  it('does not stamp location when not provided', () => {
    const el = buildBadge({ label: 'X', type: 'pill' });

    expect(el.dataset.cgBadgeLocation).toBeUndefined();
  });

  it('has no inline styles (styles live in the adopted stylesheet)', () => {
    const el = buildBadge({ label: 'Test', type: 'pill' });

    expect(el.style.length).toBe(0);
  });

  it('stylesheet defines --cge-badge-* variables with fallbacks', () => {
    expect(COMPONENT_STYLES).toContain('--cge-badge-background-color');
    expect(COMPONENT_STYLES).toContain('--cge-badge-text-color');
    expect(COMPONENT_STYLES).toContain('--cge-badge-border-radius');
    expect(COMPONENT_STYLES).toContain('--cge-badge-font-size');
    expect(COMPONENT_STYLES).toContain('--cge-badge-font-weight');
  });
});
