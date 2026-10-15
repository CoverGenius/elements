import { describe, expect, it } from 'vitest';
import { buildHeader } from '../sections/header';

describe('buildHeader', () => {
  it('renders a section element with correct class', () => {
    // Arrange
    const config = { heading: 'Your cover' };

    // Act
    const el = buildHeader(config);

    // Assert
    expect(el.tagName).toBe('SECTION');
    expect(el.className).toContain('cge-section');
    expect(el.className).toContain('cge-section-header');
  });

  it('renders heading text', () => {
    // Arrange
    const config = { heading: 'Your cover' };

    // Act
    const el = buildHeader(config);

    // Assert
    const heading = el.querySelector('.cge-heading');
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toBe('Your cover');
  });

  it('renders icon when provided', () => {
    // Arrange
    const config = { heading: 'Your cover', icon: 'shield' };

    // Act
    const el = buildHeader(config);

    // Assert
    const icon = el.querySelector('.cge-icon') as HTMLElement;
    expect(icon).not.toBeNull();
    expect(icon.dataset.cgIcon).toBe('shield');
  });

  it('omits icon when not provided', () => {
    // Arrange
    const config = { heading: 'Your cover' };

    // Act
    const el = buildHeader(config);

    // Assert
    expect(el.querySelector('.cge-icon')).toBeNull();
  });

  it('renders badge next to title when location is inline_start', () => {
    // Arrange
    const config = { heading: 'Your cover', badge: { label: 'New', location: 'inline_start' as const } };

    // Act
    const el = buildHeader(config);

    // Assert
    const row = el.querySelector('.cge-header-row') as HTMLElement;
    const badge = row.querySelector('.cge-badge') as HTMLElement;
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('New');
    expect(badge.classList.contains('cge-header-badge-end')).toBe(false);
  });

  it('renders badge on top of the header row when location is above', () => {
    // Arrange
    const config = { heading: 'Your cover', badge: { label: 'New', location: 'above' as const } };

    // Act
    const el = buildHeader(config);

    // Assert
    const badge = el.querySelector(':scope > .cge-badge') as HTMLElement;
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('New');
    expect(el.children[0]).toBe(badge);
  });

  it('renders badge across from the title when location is inline_end', () => {
    // Arrange
    const config = { heading: 'Your cover', badge: { label: 'New', location: 'inline_end' as const } };

    // Act
    const el = buildHeader(config);

    // Assert
    const row = el.querySelector('.cge-header-row') as HTMLElement;
    const badge = row.querySelector('.cge-badge') as HTMLElement;
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('New');
    expect(badge.classList.contains('cge-header-badge-end')).toBe(true);
  });

  it('renders no badge when not configured', () => {
    // Arrange
    const config = { heading: 'Your cover' };

    // Act
    const el = buildHeader(config);

    // Assert
    expect(el.querySelector('.cge-badge')).toBeNull();
  });
});
