import { describe, expect, it } from 'vitest';
import { resolveIcon } from '../components/icon';
import { ICON_REGISTRY } from '../shared/icon-registry';
import { COMPONENT_STYLES } from '../styles/generated/component-styles.generated';

describe('resolveIcon', () => {
  it('renders a span with the icon name as data attribute', () => {
    const el = resolveIcon({ name: 'check' });

    expect(el.tagName).toBe('SPAN');
    expect(el.className).toBe('cge-icon');
    expect(el.dataset.cgIcon).toBe('check');
  });

  it('sets role="img" with aria-label from name', () => {
    const el = resolveIcon({ name: 'lock' });

    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('lock');
  });

  it('has no inline styles (styles live in the adopted stylesheet)', () => {
    const el = resolveIcon({ name: 'check' });

    expect(el.style.length).toBe(0);
  });

  it('stylesheet defines --cge-icon-size and --cge-icon-color', () => {
    expect(COMPONENT_STYLES).toContain('--cge-icon-size');
    expect(COMPONENT_STYLES).toContain('--cge-icon-color');
  });

  it('renders SVG that scales to container (width="100%" height="100%")', () => {
    const el = resolveIcon({ name: 'check' });

    expect(el.innerHTML).toContain('width="100%"');
    expect(el.innerHTML).toContain('height="100%"');
    expect(el.innerHTML).not.toContain('width="24"');
  });

  it('renders SVG content for a known icon name', () => {
    const el = resolveIcon({ name: 'check' });

    expect(el.innerHTML).toContain('<svg');
  });

  it('renders fallback SVG for an unknown icon name', () => {
    const el = resolveIcon({ name: 'does-not-exist' });

    expect(el.innerHTML).toContain('<svg');
    expect(el.innerHTML).toContain('M11 19.425');
  });

  it('sets aria-hidden on decorative icons', () => {
    const el = resolveIcon({ name: 'check', decorative: true });

    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.getAttribute('role')).toBeNull();
    expect(el.getAttribute('aria-label')).toBeNull();
  });

  it('sets role="img" and aria-label on standalone icons (default)', () => {
    const el = resolveIcon({ name: 'lock' });

    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('lock');
    expect(el.getAttribute('aria-hidden')).toBeNull();
  });

  it('registers all expected icon names including shield', () => {
    const expectedNames = [
      'check',
      'copy',
      'lock',
      'download',
      'edit',
      'open-in-new',
      'ambulance',
      'delay',
      'flight-delay',
      'luggage',
      'medical',
      'military',
      'package',
      'shopping-cart',
      'slot',
      'support',
      'transit-strike',
      'user-group',
      'shield',
    ];

    for (const name of expectedNames) {
      expect(ICON_REGISTRY[name]).toBeDefined();
    }
  });
});
