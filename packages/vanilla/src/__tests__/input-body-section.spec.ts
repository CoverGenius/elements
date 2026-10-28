import { describe, expect, it } from 'vitest';
import { buildInputBody } from '../sections/input-body';
import type { InputBodyOption } from '../sections/input-body';
import { CG_ATTR, CG_ROLE } from '../shared/attributes';
import { COMPONENT_STYLES } from '../styles/generated/component-styles.generated';

function option(overrides: Partial<InputBodyOption> = {}): InputBodyOption {
  return {
    control: 'radio',
    name: 'plan',
    value: 'basic',
    optionId: 'opt_in_1',
    label: 'Basic plan',
    productIds: ['product-1'],
    ...overrides,
  };
}

describe('buildInputBody', () => {
  it('renders a section element with class cge-section cge-section-input-body', () => {
    // Arrange
    const config = { options: [option()] };

    // Act
    const el = buildInputBody(config);

    // Assert
    expect(el.tagName).toBe('SECTION');
    expect(el.className).toBe('cge-section cge-section-input-body');
  });

  describe('control types', () => {
    it('renders radio input options with correct name/value', () => {
      // Arrange
      const config = { options: [option({ control: 'radio', name: 'plan', value: 'gold' })] };

      // Act
      const el = buildInputBody(config);
      const input = el.querySelector('input') as HTMLInputElement;

      // Assert
      expect(input.type).toBe('radio');
      expect(input.name).toBe('plan');
      expect(input.value).toBe('gold');
    });

    it('renders checkbox options', () => {
      // Arrange
      const config = { options: [option({ control: 'checkbox', name: 'addon', value: 'yes' })] };

      // Act
      const el = buildInputBody(config);
      const input = el.querySelector('input') as HTMLInputElement;

      // Assert
      expect(input.type).toBe('checkbox');
      expect(input.name).toBe('addon');
      expect(input.value).toBe('yes');
    });

    it('renders CTA options with button', () => {
      // Arrange
      const config = { options: [option({ control: 'cta', buttonLabel: 'Add cover', buttonVariant: 'secondary' })] };

      // Act
      const el = buildInputBody(config);
      const header = el.querySelector('.cge-input-option-header-cta');
      const button = el.querySelector('button');

      // Assert
      expect(header).not.toBeNull();
      expect(header?.querySelector('.cge-input-option-label')?.textContent).toBe('Basic plan');
      expect(el.querySelector('input')).toBeNull();
      expect(button).not.toBeNull();
      expect(button?.textContent).toBe('Add cover');
      expect(button?.className).toContain('cge-button-secondary');
      expect(button?.getAttribute(CG_ATTR.role)).toBe(CG_ROLE.submit);
      expect(button?.getAttribute(CG_ATTR.productIds)).toBe('product-1');
      expect(button?.getAttribute(CG_ATTR.optionId)).toBe('opt_in_1');
    });

    it('places an inline_end CTA as a sibling of the option header, marked inline-end', () => {
      const el = buildInputBody({
        options: [option({ control: 'cta', buttonLabel: 'Add cover' })],
        selectionLocation: 'inline_end',
      });
      const panel = el.querySelector('.cge-input-option');
      const header = panel?.querySelector('.cge-input-option-header-cta');
      const button = panel?.querySelector('button');

      expect(header?.querySelector('button')).toBeNull();
      expect(panel?.lastElementChild?.tagName).toBe('BUTTON');
      expect(button?.textContent).toBe('Add cover');
      expect(button?.classList.contains('cge-button-inline-end')).toBe(true);
    });

    it('places a bottom CTA after the option body', () => {
      const el = buildInputBody({
        options: [option({ control: 'cta', buttonLabel: 'Add cover', description: 'Plan details' })],
        selectionLocation: 'bottom',
      });
      const panel = el.querySelector('.cge-input-option');

      expect(panel?.lastElementChild?.tagName).toBe('BUTTON');
      expect(panel?.lastElementChild?.textContent).toBe('Add cover');
    });

    it('places a collapsed non-decline CTA button as a panel-level sibling, not nested in the header', () => {
      const el = buildInputBody({
        options: [
          option({
            control: 'cta',
            buttonLabel: 'Add cover',
            description: 'Plan details',
            collapsed: true,
          }),
        ],
        selectionLocation: 'inline_end',
      });
      const panel = el.querySelector('.cge-input-option') as HTMLElement;
      const header = panel.querySelector('.cge-input-option-header-cta');
      const button = panel.querySelector('button');
      const collapse = panel.querySelector('.cge-input-option-collapse');

      // The button is a sibling of the header now (gap-aware), not nested inside its
      // trailing group. Once revealed, `.cge-input-option-collapsed > .cge-input-option-collapse`
      // gets `order: 1` in sections.css, which is what keeps this button visually anchored
      // above the revealed body rather than pushed below it by DOM order alone.
      expect(header?.querySelector('button')).toBeNull();
      expect(panel.classList.contains('cge-input-option-collapsed')).toBe(true);
      expect(panel.contains(button)).toBe(true);
      expect(header?.contains(button as Node)).toBe(false);
      expect(collapse?.contains(button as Node)).toBe(false);
    });

    it('renders a decline CTA button with the decline role', () => {
      const el = buildInputBody({
        options: [
          option({ control: 'cta', decline: true, optionId: 'opt_out', productIds: [], buttonLabel: 'No thanks' }),
        ],
      });
      const button = el.querySelector(`button[${CG_ATTR.role}="${CG_ROLE.decline}"]`);

      expect(button?.textContent).toBe('No thanks');
      expect(button?.classList.contains('cge-button-inline-end')).toBe(true);
      expect(button?.getAttribute(CG_ATTR.productIds)).toBe('');
      expect(button?.getAttribute(CG_ATTR.optionId)).toBe('opt_out');
    });

    it('pre-renders a hidden "above" badge copy for inline badges, none for other locations', () => {
      const inline = buildInputBody({
        options: [option({ badge: { label: 'Popular', location: 'inline_end' } })],
      });
      const above = inline.querySelector('.cge-input-option-above-responsive .cge-badge');

      expect(above?.textContent).toBe('Popular');
      expect(above?.classList.contains('cge-badge-above')).toBe(true);
      expect(inline.querySelector('.cge-input-option-header .cge-badge-inline-end')).not.toBeNull();

      const resting = buildInputBody({
        options: [option({ badge: { label: 'Popular', location: 'resting_start' } })],
      });

      expect(resting.querySelector('.cge-input-option-above-responsive')).toBeNull();
    });

    it('keeps a decline CTA primary when buttonVariant is explicitly primary', () => {
      const el = buildInputBody({
        options: [
          option({
            control: 'cta',
            decline: true,
            optionId: 'opt_out',
            productIds: [],
            buttonLabel: 'No',
            buttonVariant: 'primary',
          }),
        ],
      });

      expect(el.querySelector('button')?.classList.contains('cge-button-secondary')).toBe(false);
    });

    it('defaults a decline CTA to the secondary style, opt_in stays primary', () => {
      const el = buildInputBody({
        options: [
          option({ control: 'cta', buttonLabel: 'Add cover' }),
          option({ control: 'cta', decline: true, optionId: 'opt_out', productIds: [], buttonLabel: 'No thanks' }),
        ],
      });
      const submit = el.querySelector(`button[${CG_ATTR.role}="${CG_ROLE.submit}"]`);
      const decline = el.querySelector(`button[${CG_ATTR.role}="${CG_ROLE.decline}"]`);

      expect(submit?.classList.contains('cge-button-secondary')).toBe(false);
      expect(decline?.classList.contains('cge-button-secondary')).toBe(true);
    });

    it('renders resting and selected labels with a check icon when a selected label is given', () => {
      const el = buildInputBody({
        options: [option({ control: 'cta', buttonLabel: 'Add cover', buttonSelectedLabel: 'Added' })],
      });
      const button = el.querySelector('button');

      expect(button?.classList.contains('cge-button-has-selected')).toBe(true);
      expect(button?.querySelector('.cge-button-label-resting')?.textContent).toBe('Add cover');
      expect(button?.querySelector('.cge-button-label-selected')?.textContent).toBe('Added');
      expect(button?.querySelector('.cge-button-label-selected .cge-button-check svg')).not.toBeNull();
    });

    it('places CTA option links below the button in side-by-side layout', () => {
      const el = buildInputBody({
        options: [
          option({
            control: 'cta',
            buttonLabel: 'Continue',
            description: 'Coverage details',
            links: [
              { href: '#terms', label: 'Terms' },
              { href: '#privacy', label: 'Privacy' },
            ],
          }),
        ],
        layout: 'side_by_side',
        textAlign: 'center',
      });
      const panel = el.querySelector('.cge-input-option');
      const button = panel?.querySelector('.cge-button');
      const links = panel?.querySelector('.cge-option-links');

      expect(panel?.querySelector('.cge-input-option-description')?.textContent).toBe('Coverage details');
      expect(button?.nextElementSibling).toBe(links?.parentElement);
      expect(links?.textContent).toBe('Terms|Privacy');
    });

    it('places a CTA terms link below the button in side-by-side layout', () => {
      const el = buildInputBody({
        options: [option({ control: 'cta', buttonLabel: 'Continue', termsLink: { href: '#terms', label: 'Terms' } })],
        layout: 'side_by_side',
      });
      const panel = el.querySelector('.cge-input-option') as HTMLElement;
      const button = panel.querySelector('.cge-button') as HTMLElement;
      const link = panel.querySelector('.cge-terms-link');
      const linksCollapse = button.nextElementSibling as HTMLElement;

      expect(linksCollapse.classList.contains('cge-input-option-collapse')).toBe(true);
      expect(linksCollapse.contains(link)).toBe(true);
    });
  });

  describe('CTA option links placement', () => {
    const links = [{ href: '#terms', label: 'Terms' }];

    it('keeps links in the body, uncentered, when the CTA is inline_end', () => {
      const el = buildInputBody({
        options: [option({ control: 'cta', buttonLabel: 'Add', links })],
        selectionLocation: 'inline_end',
      });
      const container = el.querySelector('.cge-option-links') as HTMLElement;

      expect(container.classList.contains('cge-option-links-cta')).toBe(false);
      expect(container.closest('.cge-input-option-body')).not.toBeNull();
    });

    it.each(['bottom'] as const)('centers links under the button when the CTA location is %s', (selectionLocation) => {
      const el = buildInputBody({
        options: [option({ control: 'cta', buttonLabel: 'Add', links })],
        selectionLocation,
      });

      expect(el.querySelector('.cge-option-links')?.classList.contains('cge-option-links-cta')).toBe(true);
    });

    it('defaults card layout to a bottom CTA with centered links', () => {
      const el = buildInputBody({
        options: [option({ control: 'cta', buttonLabel: 'Add', links })],
        layout: 'side_by_side',
      });

      expect(el.querySelector('.cge-option-links')?.classList.contains('cge-option-links-cta')).toBe(true);
    });
  });

  it('places opt-in info panels at the top or bottom of option content', () => {
    const top = buildInputBody({
      options: [option({ infoPanel: { content: 'Top note', location: 'top' }, description: 'Details' })],
    });
    const bottom = buildInputBody({
      options: [option({ infoPanel: { content: 'Bottom note', location: 'bottom' }, description: 'Details' })],
    });
    const topBody = top.querySelector('.cge-input-option-body');
    const bottomBody = bottom.querySelector('.cge-input-option-body');

    expect(topBody?.firstElementChild?.classList.contains('cge-message-info')).toBe(true);
    expect(bottomBody?.lastElementChild?.classList.contains('cge-message-info')).toBe(true);
  });

  describe('option state classes', () => {
    it('sets cge-input-option-selected class when checked is true', () => {
      // Arrange
      const config = { options: [option({ checked: true })] };

      // Act
      const el = buildInputBody(config);
      const panel = el.querySelector('.cge-input-option');

      // Assert
      expect(panel?.className).toContain('cge-input-option-selected');
    });

    it('sets cge-input-option-error class when error is true', () => {
      // Arrange
      const config = { options: [option({ error: true })] };

      // Act
      const el = buildInputBody(config);
      const panel = el.querySelector('.cge-input-option');

      // Assert
      expect(panel?.className).toContain('cge-input-option-error');
    });
  });

  describe('layout', () => {
    it('renders side_by_side layout with row container', () => {
      // Arrange
      const config = {
        options: [option({ value: 'a' }), option({ value: 'b' })],
        layout: 'side_by_side' as const,
      };

      // Act
      const el = buildInputBody(config);
      const row = el.querySelector('.cge-input-options-row');

      // Assert
      expect(row).not.toBeNull();
      expect(row?.children).toHaveLength(2);
    });

    it('renders stacked layout (default) without row container', () => {
      // Arrange
      const config = { options: [option({ value: 'a' }), option({ value: 'b' })] };

      // Act
      const el = buildInputBody(config);
      const optionsContainer = el.querySelector('.cge-input-body-options');

      // Assert
      expect(el.querySelector('.cge-input-options-row')).toBeNull();
      expect(optionsContainer?.children).toHaveLength(2);
    });

    it('places decline options outside the row in side_by_side layout', () => {
      // Arrange
      const config = {
        options: [option({ value: 'a' }), option({ value: 'decline', decline: true })],
        layout: 'side_by_side' as const,
      };

      // Act
      const el = buildInputBody(config);
      const optionsContainer = el.querySelector('.cge-input-body-options') as HTMLElement;
      const row = optionsContainer.querySelector('.cge-input-options-row') as HTMLElement;

      // Assert
      expect(row.children).toHaveLength(1);
      expect(optionsContainer.children).toHaveLength(2);
    });
  });

  it('renders an above badge separately from the control and content layout', () => {
    // Arrange
    const config = {
      options: [option({ badge: { label: 'Popular', location: 'above' } })],
      selectionLocation: 'inline_end' as const,
    };

    // Act
    const el = buildInputBody(config);
    const panel = el.querySelector('.cge-input-option') as HTMLElement;
    const above = panel.querySelector('.cge-input-option-above');
    const badge = above?.querySelector('.cge-badge');
    const children = Array.from(panel.children);

    // Assert
    expect(badge?.textContent).toBe('Popular');
    expect(children[0]).toBe(above);
    expect(above?.children[0]).toBe(badge);
    expect(above?.children[1]?.classList.contains('cge-input-option-control')).toBe(true);
    expect(children[1]?.classList.contains('cge-input-option-content')).toBe(true);
  });

  it('keeps the start-aligned control below an above badge', () => {
    const el = buildInputBody({ options: [option({ badge: { label: 'Popular', location: 'above' } })] });
    const panel = el.querySelector('.cge-input-option') as HTMLElement;
    const above = panel.querySelector('.cge-input-option-above');
    const children = Array.from(panel.children);

    expect(above?.querySelector('.cge-badge')?.textContent).toBe('Popular');
    expect(above?.children).toHaveLength(1);
    expect(children[1]?.classList.contains('cge-input-option-control')).toBe(true);
    expect(children[2]?.classList.contains('cge-input-option-content')).toBe(true);
  });

  it('renders description, subtitle, benefits when provided', () => {
    // Arrange
    const config = {
      options: [
        option({
          subtitle: 'From $10/month',
          description: 'Covers medical expenses',
          benefits: [
            { name: 'support', text: '24/7 support' },
            { name: 'coverage', text: 'Worldwide coverage' },
          ],
        }),
      ],
    };

    // Act
    const el = buildInputBody(config);
    const subtitle = el.querySelector('.cge-input-option-subtitle');
    const description = el.querySelector('.cge-input-option-description');
    const benefits = el.querySelector('.cge-input-option-benefits');

    // Assert
    expect(subtitle?.textContent).toBe('From $10/month');
    expect(description?.textContent).toBe('Covers medical expenses');
    expect(benefits?.children).toHaveLength(2);
    expect(benefits?.children[0].textContent).toContain('24/7 support');
  });

  it('renders terms link on option', () => {
    // Arrange
    const config = {
      options: [option({ termsLink: { href: 'https://example.com/terms', label: 'Terms apply' } })],
    };

    // Act
    const el = buildInputBody(config);
    const link = el.querySelector('.cge-terms-link') as HTMLAnchorElement;

    // Assert
    expect(link).not.toBeNull();
    expect(link.textContent).toBe('Terms apply');
    expect(link.getAttribute('href')).toBe('https://example.com/terms');
  });

  it('renders warning message on option', () => {
    // Arrange
    const config = { options: [option({ warningMessage: 'This plan excludes pre-existing conditions' })] };

    // Act
    const el = buildInputBody(config);
    const warning = el.querySelector('.cge-message-warning');

    // Assert
    expect(warning).not.toBeNull();
    expect(warning?.textContent).toContain('This plan excludes pre-existing conditions');
  });

  it("supports selectionLocation 'inline_end' (content before control)", () => {
    // Arrange
    const config = { options: [option()], selectionLocation: 'inline_end' as const };

    // Act
    const el = buildInputBody(config);
    const panel = el.querySelector('.cge-input-option') as HTMLElement;
    const content = panel.querySelector('.cge-input-option-content') as HTMLElement;
    const control = panel.querySelector('.cge-input-option-control') as HTMLElement;

    // Assert: content comes before control in DOM order
    const children = Array.from(panel.children).filter(
      (c) => c.classList.contains('cge-input-option-content') || c.classList.contains('cge-input-option-control'),
    );
    expect(children[0]).toBe(content);
    expect(children[1]).toBe(control);
  });

  describe('selectionLocation resolution by control kind', () => {
    const controlOrder = (el: HTMLElement): string[] =>
      Array.from(el.querySelector('.cge-input-option')!.children)
        .filter(
          (c) => c.classList.contains('cge-input-option-control') || c.classList.contains('cge-input-option-content'),
        )
        .map((c) => (c.classList.contains('cge-input-option-control') ? 'control' : 'content'));

    it.each([undefined, 'inline_start', 'bottom'] as const)(
      'keeps a radio control leading when selectionLocation is %s',
      (selectionLocation) => {
        // Arrange
        const config = { options: [option()], selectionLocation };

        // Act
        const el = buildInputBody(config);

        // Assert
        expect(controlOrder(el)).toEqual(['control', 'content']);
      },
    );

    it('places a checkbox control at the end edge for inline_end', () => {
      // Arrange
      const config = { options: [option({ control: 'checkbox' })], selectionLocation: 'inline_end' as const };

      // Act
      const el = buildInputBody(config);

      // Assert
      expect(controlOrder(el)).toEqual(['content', 'control']);
    });

    it('keeps the control leading below an above badge when inline_start is explicit', () => {
      // Arrange
      const config = {
        options: [option({ badge: { label: 'Popular', location: 'above' } })],
        selectionLocation: 'inline_start' as const,
      };

      // Act
      const el = buildInputBody(config);
      const above = el.querySelector('.cge-input-option-above') as HTMLElement;

      // Assert
      expect(above.children).toHaveLength(1);
      expect(controlOrder(el)).toEqual(['control', 'content']);
    });

    const cta = () => option({ control: 'cta', buttonLabel: 'Add' });
    const isInlineEnd = (el: HTMLElement) =>
      el.querySelector('.cge-button')!.classList.contains('cge-button-inline-end');

    it('falls back to inline_end for a stacked CTA given inline_start or no location', () => {
      for (const selectionLocation of [undefined, 'inline_start'] as const) {
        // Arrange + Act
        const el = buildInputBody({ options: [cta()], selectionLocation });

        // Assert
        expect(isInlineEnd(el), `location=${String(selectionLocation)}`).toBe(true);
      }
    });

    it('falls back to bottom for a side_by_side CTA given inline_start or no location', () => {
      for (const selectionLocation of [undefined, 'inline_start'] as const) {
        const el = buildInputBody({ options: [cta()], layout: 'side_by_side', selectionLocation });

        expect(isInlineEnd(el), `location=${String(selectionLocation)}`).toBe(false);
      }
    });

    it('honours inline_end for a side_by_side CTA', () => {
      const el = buildInputBody({ options: [cta()], layout: 'side_by_side', selectionLocation: 'inline_end' });

      expect(isInlineEnd(el)).toBe(true);
    });
  });

  describe('interaction hooks (data-cg-*)', () => {
    it('stamps the option role and product ids on the option wrapper', () => {
      const el = buildInputBody({ options: [option({ productIds: ['q1', 'q2'] })] });
      const panel = el.querySelector('.cge-input-option') as HTMLElement;

      expect(panel.getAttribute(CG_ATTR.role)).toBe(CG_ROLE.option);
      expect(panel.getAttribute(CG_ATTR.productIds)).toBe('q1 q2');
    });

    it('stamps the selection-control role on the nested input, not the wrapper', () => {
      const el = buildInputBody({ options: [option()] });
      const panel = el.querySelector('.cge-input-option') as HTMLElement;
      const input = panel.querySelector('input') as HTMLInputElement;

      expect(input.getAttribute(CG_ATTR.role)).toBe(CG_ROLE.selectionControl);
      // wrapper carries `option`, never `selection-control`
      expect(panel.getAttribute(CG_ATTR.role)).not.toBe(CG_ROLE.selectionControl);
    });

    it('stamps the decline role on a decline option wrapper', () => {
      const el = buildInputBody({ options: [option({ decline: true, productIds: [] })] });
      const panel = el.querySelector('.cge-input-option') as HTMLElement;

      expect(panel.getAttribute(CG_ATTR.role)).toBe(CG_ROLE.decline);
      expect(panel.getAttribute(CG_ATTR.productIds)).toBe('');
    });

    it('collapses a decline option that has body content, same as an opt_in option', () => {
      const el = buildInputBody({
        options: [option({ decline: true, productIds: [], description: 'No thanks', collapsed: true })],
      });
      const panel = el.querySelector('.cge-input-option') as HTMLElement;
      const collapse = panel.querySelector('.cge-input-option-collapse');

      expect(panel.classList.contains('cge-input-option-collapsed')).toBe(true);
      expect(collapse).not.toBeNull();
      expect(collapse?.querySelector('.cge-input-option-description')?.textContent).toBe('No thanks');
    });

    it("aligns a decline option's content to the selector, not the title, regardless of contentAlign", () => {
      const el = buildInputBody({
        options: [option({ decline: true, productIds: [], description: 'No thanks' })],
        contentAlign: 'title',
      });
      const panel = el.querySelector('.cge-input-option') as HTMLElement;
      const collapse = panel.querySelector(':scope > .cge-input-option-collapse');
      const contentCollapse = panel.querySelector('.cge-input-option-content > .cge-input-option-collapse');

      expect(collapse).not.toBeNull();
      expect(contentCollapse).toBeNull();
    });

    it("still aligns an opt_in option's content to the title by default", () => {
      const el = buildInputBody({ options: [option({ description: 'Covers medical expenses' })] });
      const panel = el.querySelector('.cge-input-option') as HTMLElement;
      const collapse = panel.querySelector(':scope > .cge-input-option-collapse');
      const contentCollapse = panel.querySelector('.cge-input-option-content > .cge-input-option-collapse');

      expect(collapse).toBeNull();
      expect(contentCollapse).not.toBeNull();
    });
  });

  describe('CTA selection styling', () => {
    it('applies the selected-border rule via data-cg-selected, the attribute-based path used when there is no native checked input', () => {
      expect(COMPONENT_STYLES).toContain('.cge-input-option[data-cg-selected]');
    });

    it('does not add the side-by-side bottom-CTA top margin to a compact inline-end CTA', () => {
      expect(COMPONENT_STYLES).toContain(
        '.cge-input-options-row > .cge-input-option > .cge-button:not(.cge-button-inline-end)',
      );
    });
  });
});
