import { describe, expect, it } from 'vitest';
import { buildTermsLink } from '../components/terms-link';
import { COMPONENT_STYLES } from '../styles/generated/component-styles.generated';

describe('buildTermsLink', () => {
  it('renders an anchor element with href and label', () => {
    const el = buildTermsLink({ href: 'https://example.com/terms', label: 'Terms & Conditions' });

    expect(el.tagName).toBe('A');
    expect(el.textContent).toBe('Terms & Conditions');
    expect(el.getAttribute('href')).toBe('https://example.com/terms');
  });

  it('opens in a new tab with noopener noreferrer', () => {
    const el = buildTermsLink({ href: 'https://example.com', label: 'Link' });

    expect(el.getAttribute('target')).toBe('_blank');
    expect(el.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('has the cge-terms-link class', () => {
    const el = buildTermsLink({ href: '#', label: 'PDS' });

    expect(el.className).toBe('cge-terms-link');
  });

  it('has no inline styles (styles live in the adopted stylesheet)', () => {
    const el = buildTermsLink({ href: '#', label: 'Link' });

    expect(el.style.length).toBe(0);
  });

  it('stylesheet defines --cge-link-color and --cge-terms-link-font-size', () => {
    expect(COMPONENT_STYLES).toContain('--cge-link-color');
    expect(COMPONENT_STYLES).toContain('--cge-terms-link-font-size');
  });

  it('composes the link from parts without parsing HTML', () => {
    const el = buildTermsLink({ href: 'https://example.com/<script>', label: '<b>Bold</b>' });

    expect(el.textContent).toBe('<b>Bold</b>');
    expect(el.innerHTML).not.toContain('<b>');
  });
});
