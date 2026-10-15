import { describe, expect, it } from 'vitest';
import { buildBottomBody } from '../sections/bottom-body';
import { COMPONENT_STYLES } from '../styles/generated/component-styles.generated';

describe('buildBottomBody', () => {
  it('renders a section element with class cge-section cge-section-bottom-body', () => {
    // Arrange
    const config = {};

    // Act
    const el = buildBottomBody(config);

    // Assert
    expect(el.tagName).toBe('SECTION');
    expect(el.className).toBe('cge-section cge-section-bottom-body');
  });

  it('renders heading when provided', () => {
    // Arrange
    const config = { heading: 'What our customers say' };

    // Act
    const el = buildBottomBody(config);

    // Assert
    const heading = el.querySelector('.cge-bottom-body-heading');
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toBe('What our customers say');
  });

  it('renders testimonial panel with quote text wrapped in curly quotes', () => {
    // Arrange
    const config = { testimonial: { text: 'Great cover, easy claim.' } };

    // Act
    const el = buildBottomBody(config);

    // Assert
    const quote = el.querySelector('.cge-testimonial-quote');
    expect(quote).not.toBeNull();
    expect(quote?.textContent).toBe('“Great cover, easy claim.”');
  });

  it('adds cge-testimonial-rated class when testimonial has a rating', () => {
    // Arrange
    const config = { testimonial: { text: 'Loved it', rating: 5 } };

    // Act
    const el = buildBottomBody(config);

    // Assert
    const panel = el.querySelector('.cge-testimonial-panel');
    expect(panel?.classList.contains('cge-testimonial-rated')).toBe(true);
    expect(panel?.classList.contains('cge-testimonial-plain')).toBe(false);
  });

  it('adds cge-testimonial-plain class when testimonial has no rating', () => {
    // Arrange
    const config = { testimonial: { text: 'Loved it' } };

    // Act
    const el = buildBottomBody(config);

    // Assert
    const panel = el.querySelector('.cge-testimonial-panel');
    expect(panel?.classList.contains('cge-testimonial-plain')).toBe(true);
    expect(panel?.classList.contains('cge-testimonial-rated')).toBe(false);
  });

  it('renders star rating when rating is provided', () => {
    // Arrange
    const config = { testimonial: { text: 'Great', rating: 4 } };

    // Act
    const el = buildBottomBody(config);

    // Assert
    const stars = el.querySelector('.cge-stars');
    expect(stars).not.toBeNull();
    expect(stars?.getAttribute('aria-label')).toBe('4 out of 5 stars');
    expect(stars?.querySelectorAll('.cge-star')).toHaveLength(5);
  });

  it('does not render star rating when rating is not provided', () => {
    // Arrange
    const config = { testimonial: { text: 'Great' } };

    // Act
    const el = buildBottomBody(config);

    // Assert
    expect(el.querySelector('.cge-stars')).toBeNull();
  });

  it('omits the testimonial footer entirely when there is no rating or author', () => {
    // Arrange
    const config = { testimonial: { text: 'Text only, no attribution' } };

    // Act
    const el = buildBottomBody(config);

    // Assert
    expect(el.querySelector('.cge-testimonial-footer')).toBeNull();
  });

  it('renders author cite when provided', () => {
    // Arrange
    const config = { testimonial: { text: 'Great', author: 'Jane D.' } };

    // Act
    const el = buildBottomBody(config);

    // Assert
    const cite = el.querySelector('cite.cge-testimonial-cite');
    expect(cite).not.toBeNull();
    expect(cite?.textContent).toBe('Jane D.');
  });

  it('does not render author cite when not provided', () => {
    // Arrange
    const config = { testimonial: { text: 'Great' } };

    // Act
    const el = buildBottomBody(config);

    // Assert
    expect(el.querySelector('.cge-testimonial-cite')).toBeNull();
  });

  it('renders trustpilot panel with full and half-star support for fractional scores', () => {
    // Arrange
    const config = { trustpilot: { score: 4.5, label: 'Rated 4.5 out of 5' } };

    // Act
    const el = buildBottomBody(config);

    // Assert
    const boxes = el.querySelectorAll('.cge-trustpilot-star-box');
    expect(boxes).toHaveLength(5);
    expect(el.querySelectorAll('.cge-trustpilot-star-half')).toHaveLength(1);
    expect(el.querySelectorAll('.cge-trustpilot-star-empty')).toHaveLength(0);
  });

  it('renders trustpilot label text', () => {
    // Arrange
    const config = { trustpilot: { score: 4.5, label: 'Rated 4.5 out of 5' } };

    // Act
    const el = buildBottomBody(config);

    // Assert
    const label = el.querySelector('.cge-trustpilot-rating');
    expect(label?.textContent).toBe('Rated 4.5 out of 5');
  });

  it('renders sales count icon and text', () => {
    // Arrange
    const config = { salesCount: { text: '10,000+ policies sold' } };

    // Act
    const el = buildBottomBody(config);

    // Assert
    const panel = el.querySelector('.cge-sales-count-panel');
    expect(panel).not.toBeNull();
    expect(panel?.querySelector('.cge-sales-count-icon')).not.toBeNull();
    expect(panel?.querySelector('.cge-sales-count-text')?.textContent).toBe('10,000+ policies sold');
  });

  it('renders the configured info message', () => {
    const el = buildBottomBody({ infoMessage: { content: 'Cover ends at midnight' } });
    const message = el.querySelector('.cge-message-info');

    expect(message).not.toBeNull();
    expect(message?.querySelector('.cge-message-text')?.textContent).toBe('Cover ends at midnight');
  });

  it('places info messages at the requested top or bottom location', () => {
    const top = buildBottomBody({
      heading: 'Reviews',
      infoMessage: { content: 'Policy note', location: 'top' },
      testimonial: { text: 'Great cover' },
    });
    const bottom = buildBottomBody({
      testimonial: { text: 'Great cover' },
      infoMessage: { content: 'Policy note', location: 'bottom' },
    });

    expect(top.children[1].classList.contains('cge-message-info')).toBe(true);
    expect(bottom.lastElementChild?.classList.contains('cge-message-info')).toBe(true);
  });

  it('scopes the info panel background to its own theme variable', () => {
    const el = buildBottomBody({ infoMessage: { content: 'Cover ends at midnight' } });

    expect(el.querySelector('.cge-message-info')).not.toBeNull();
    expect(COMPONENT_STYLES).toContain('.cge-section-bottom-body .cge-message-info');
    expect(COMPONENT_STYLES).toContain('var(--cge-bottom-info-panel-background-color');
  });

  it('omits sections that are not configured', () => {
    // Arrange
    const config = {};

    // Act
    const el = buildBottomBody(config);

    // Assert
    expect(el.querySelector('.cge-heading')).toBeNull();
    expect(el.querySelector('.cge-testimonial-panel')).toBeNull();
    expect(el.querySelector('.cge-trustpilot-panel')).toBeNull();
    expect(el.querySelector('.cge-sales-count-panel')).toBeNull();
    expect(el.querySelector('.cge-message')).toBeNull();
    expect(el.children).toHaveLength(0);
  });
});
