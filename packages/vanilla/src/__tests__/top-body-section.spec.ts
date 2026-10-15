import { describe, expect, it } from 'vitest';
import { buildTopBody } from '../sections/top-body';

describe('buildTopBody', () => {
  it('renders a section element with correct class', () => {
    // Arrange
    const config = { heading: 'Cover summary' };

    // Act
    const el = buildTopBody(config);

    // Assert
    expect(el.tagName).toBe('SECTION');
    expect(el.className).toContain('cge-section');
    expect(el.className).toContain('cge-section-top-body');
  });

  it('renders subheading text', () => {
    // Arrange
    const config = { subheading: 'Everything you need to know' };

    // Act
    const el = buildTopBody(config);

    // Assert
    const sub = el.querySelector('.cge-section-subheading');
    expect(sub).not.toBeNull();
    expect(sub?.textContent).toContain('Everything you need to know');
  });

  it('renders terms link when provided', () => {
    // Arrange
    const config = { termsLink: { href: '/terms', label: 'Read the terms' } };

    // Act
    const el = buildTopBody(config);

    // Assert
    const link = el.querySelector('.cge-terms-link') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('/terms');
    expect(link.textContent).toBe('Read the terms');
  });

  it('renders benefit list when provided', () => {
    // Arrange
    const config = {
      benefits: {
        heading: 'Benefits',
        items: [{ name: 'baggage', text: 'Lost baggage' }],
      },
    };

    // Act
    const el = buildTopBody(config);

    // Assert
    const list = el.querySelector('.cge-list');
    expect(list).not.toBeNull();
    expect(list?.querySelector('.cge-list-tick-item')?.textContent).toContain('Lost baggage');
  });

  it('renders highlight panel list when type is panel', () => {
    // Arrange
    const config = {
      benefits: {
        type: 'panel' as const,
        items: [{ name: 'medical', text: 'Medical expenses' }],
      },
    };

    // Act
    const el = buildTopBody(config);

    // Assert
    const list = el.querySelector('.cge-list-panel');
    expect(list).not.toBeNull();
    const panelItem = list?.querySelector('.cge-list-panel-item');
    expect(panelItem).not.toBeNull();
    expect(panelItem?.querySelector('.cge-list-panel-title')?.textContent).toBe('Medical expenses');
  });

  it('places panels in their requested slots and keeps info before required within a slot', () => {
    const el = buildTopBody({
      heading: 'Heading',
      infoMessage: { content: 'Top info', location: 'top' },
      subheading: 'Subheading',
      requiredPanel: { content: 'Middle required', location: 'middle' },
      benefits: { items: [{ name: 'benefit', text: 'Benefit' }] },
    });
    const children = Array.from(el.children);

    expect(children[0].className).toBe('cge-top-body-heading');
    expect(children[1].className).toBe('cge-message cge-message-info');
    expect(children[2].className).toBe('cge-section-subheading');
    expect(children[3].className).toBe('cge-required-inline');
    expect(children[4].classList.contains('cge-list')).toBe(true);

    const defaultBottom = buildTopBody({
      infoMessage: { content: 'Info' },
      requiredPanel: { content: 'Required' },
    });
    expect(defaultBottom.querySelector('.cge-message')?.className).toBe('cge-message cge-message-info');
    expect(defaultBottom.querySelector('.cge-required-inline')?.textContent).toBe('Required');
  });

  it('preserves panel locations when required is top and info is bottom', () => {
    const el = buildTopBody({
      heading: 'Heading',
      requiredPanel: { content: 'Required', location: 'top' },
      subheading: 'Subheading',
      infoMessage: { content: 'Info', location: 'bottom' },
    });

    expect(Array.from(el.children, (child) => child.className)).toEqual([
      'cge-top-body-heading',
      'cge-required-inline',
      'cge-section-subheading',
      'cge-message cge-message-info',
    ]);
  });

  it('omits optional elements when not configured', () => {
    // Arrange
    const config = {};

    // Act
    const el = buildTopBody(config);

    // Assert
    expect(el.querySelector('.cge-section-subheading')).toBeNull();
    expect(el.querySelector('.cge-terms-link')).toBeNull();
    expect(el.querySelector('.cge-list')).toBeNull();
    expect(el.querySelector('.cge-required-inline')).toBeNull();
    expect(el.querySelector('.cge-message')).toBeNull();
    expect(el.children).toHaveLength(0);
  });
});
