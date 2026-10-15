import { describe, expect, it } from 'vitest';
import { buildHeading } from '../components/heading';
import { COMPONENT_STYLES } from '../styles/generated/component-styles.generated';

describe('buildHeading', () => {
  it('renders an h2 by default', () => {
    const el = buildHeading({ text: 'Travel Insurance' });

    expect(el.tagName).toBe('H2');
    expect(el.textContent).toBe('Travel Insurance');
    expect(el.className).toBe('cge-heading');
  });

  it('renders the requested heading level', () => {
    const h3 = buildHeading({ text: 'Sub', level: 'h3' });
    const h1 = buildHeading({ text: 'Main', level: 'h1' });

    expect(h3.tagName).toBe('H3');
    expect(h1.tagName).toBe('H1');
  });

  it('has no inline styles (styles live in the adopted stylesheet)', () => {
    const el = buildHeading({ text: 'Test' });

    expect(el.style.length).toBe(0);
  });

  it('stylesheet defines --cge-header-heading-* variables with fallbacks', () => {
    expect(COMPONENT_STYLES).toContain('--cge-header-heading-color');
    expect(COMPONENT_STYLES).toContain('--cge-header-heading-size');
    expect(COMPONENT_STYLES).toContain('--cge-header-heading-font-weight');
  });

  it('applies variant class when variant is provided', () => {
    const el = buildHeading({ text: 'Section', variant: 'section' });

    expect(el.className).toBe('cge-heading cge-heading-section');
  });

  it('uses default class when variant is not provided', () => {
    const el = buildHeading({ text: 'Header' });

    expect(el.className).toBe('cge-heading');
  });
});
