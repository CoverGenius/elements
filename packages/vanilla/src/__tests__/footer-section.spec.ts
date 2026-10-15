import { describe, expect, it } from 'vitest';
import { buildFooter } from '../sections/footer';

describe('buildFooter', () => {
  it('renders a section element with class cge-section cge-section-footer', () => {
    // Arrange
    const config = {};

    // Act
    const el = buildFooter(config);

    // Assert
    expect(el.tagName).toBe('SECTION');
    expect(el.className).toBe('cge-section cge-section-footer');
  });

  it('renders disclaimer text', () => {
    // Arrange
    const config = { disclaimer: 'Terms and conditions apply.' };

    // Act
    const el = buildFooter(config);

    // Assert
    const disclaimer = el.querySelector('.cge-footer-disclaimer');
    expect(disclaimer).not.toBeNull();
    expect(disclaimer?.textContent).toBe('Terms and conditions apply.');
  });

  it('renders terms link when provided', () => {
    // Arrange
    const config = { termsLink: { href: 'https://example.com/terms', label: 'Terms' } };

    // Act
    const el = buildFooter(config);

    // Assert
    const link = el.querySelector('a.cge-terms-link');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('https://example.com/terms');
    expect(link?.textContent).toBe('Terms');
  });

  it('appends terms link after disclaimer text', () => {
    // Arrange
    const config = {
      disclaimer: 'Terms and conditions apply.',
      termsLink: { href: 'https://example.com/terms', label: 'Terms' },
    };

    // Act
    const el = buildFooter(config);

    // Assert
    const disclaimer = el.querySelector('.cge-footer-disclaimer') as HTMLElement;
    expect(disclaimer).not.toBeNull();
    const p = disclaimer.querySelector('p') as HTMLElement;
    expect(p).not.toBeNull();
    const link = p.querySelector('a.cge-terms-link');
    expect(link).not.toBeNull();
    expect(p.textContent).toContain('Terms and conditions apply.');
    expect(p.textContent).toContain('Terms');
  });

  it('renders terms link on its own when disclaimer is not configured', () => {
    // Arrange
    const config = { termsLink: { href: 'https://example.com/terms', label: 'Terms' } };

    // Act
    const el = buildFooter(config);

    // Assert
    expect(el.querySelector('.cge-footer-disclaimer')).toBeNull();
    expect(el.querySelector('a.cge-terms-link')).not.toBeNull();
  });

  it('renders logo with text and brand', () => {
    // Arrange
    const config = { logo: { text: 'Powered by', brand: 'XCover' } };

    // Act
    const el = buildFooter(config);

    // Assert
    const logo = el.querySelector('.cge-footer-logo');
    expect(logo).not.toBeNull();
    expect(logo?.querySelector('.cge-footer-logo-text')?.textContent).toBe('Powered by');
    expect(logo?.querySelector('.cge-footer-logo-brand')?.textContent).toBe('XCover');
    expect(logo?.querySelector('.cge-footer-logo-icon')).toBeNull();
  });

  it('renders logo with icon instead of brand text when icon is set', () => {
    // Arrange
    const config = { logo: { text: 'Powered by', brand: 'XCover', icon: 'xcover-logo' } };

    // Act
    const el = buildFooter(config);

    // Assert
    const logo = el.querySelector('.cge-footer-logo');
    expect(logo?.querySelector('.cge-footer-logo-icon')).not.toBeNull();
    expect(logo?.querySelector('.cge-footer-logo-brand')).toBeNull();
    expect(logo?.querySelector('.cge-footer-logo-text')?.textContent).toBe('Powered by');
  });

  it('omits logo when not configured', () => {
    // Arrange
    const config = { disclaimer: 'Terms apply.' };

    // Act
    const el = buildFooter(config);

    // Assert
    expect(el.querySelector('.cge-footer-logo')).toBeNull();
  });

  it('stamps the stacked content and centered logo classes when logo location is below', () => {
    const el = buildFooter({
      logo: { text: 'Powered by', icon: 'xcover-logo', location: 'below' },
    });

    expect(el.querySelector('.cge-footer-content')?.classList.contains('cge-footer-content-stacked')).toBe(true);
    expect(el.querySelector('.cge-footer-logo')?.classList.contains('cge-footer-logo-below')).toBe(true);
  });

  it('keeps the non-stacked classes when logo location is inline_end or unset', () => {
    for (const location of ['inline_end' as const, undefined]) {
      const el = buildFooter({
        logo: { text: 'Powered by', icon: 'xcover-logo', ...(location ? { location } : {}) },
      });

      expect(el.querySelector('.cge-footer-content-stacked')).toBeNull();
      expect(el.querySelector('.cge-footer-logo-below')).toBeNull();
    }
  });

  it('omits disclaimer when not configured', () => {
    // Arrange
    const config = { logo: { text: 'Powered by', brand: 'XCover' } };

    // Act
    const el = buildFooter(config);

    // Assert
    expect(el.querySelector('.cge-footer-disclaimer')).toBeNull();
  });
});
