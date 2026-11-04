import { describe, expect, it } from 'vitest';

import { COMPONENT_STYLES as RAW_STYLES } from '../styles/generated/component-styles.generated';
import { internalThemeDefaults } from '../theme/wire-mapping';
import { SEMANTIC_FAN_OUT, THEMABLE_VARIABLES } from '../theme/themable-variables';

// Selector line-wrapping is a formatting detail, not part of the contract.
const COMPONENT_STYLES = RAW_STYLES.replace(/\s+/g, ' ');

// Read by a stylesheet but deliberately not themable: nothing sets it, so it only
// ever resolves to its currentColor fallback.
const INTERNAL_ONLY: ReadonlySet<string> = new Set(['--cge-icon-color']);

const READ = /var\((--cge-[a-z0-9-]+)/g;

const readByStyles = new Set([...COMPONENT_STYLES.matchAll(READ)].map((m) => m[1]));

const themable = new Set<string>(Object.values(THEMABLE_VARIABLES));

describe('themable variable consumers', () => {
  it('every themable variable is read by a stylesheet, or is the master of one that is', () => {
    const orphans = Object.entries(THEMABLE_VARIABLES)
      .filter(([, cssVar]) => !readByStyles.has(cssVar))
      .map(([wire]) => wire);

    expect(orphans).toEqual([]);
  });

  it('every variable a stylesheet reads is themable, bar the internal allowlist', () => {
    const unthemable = [...readByStyles].filter((cssVar) => !themable.has(cssVar) && !INTERNAL_ONLY.has(cssVar));

    expect(unthemable).toEqual([]);
  });

  it('keeps the internal allowlist honest: each entry is still read and still not themable', () => {
    for (const cssVar of INTERNAL_ONLY) {
      expect(readByStyles.has(cssVar)).toBe(true);
      expect(themable.has(cssVar)).toBe(false);
    }
  });
});

describe('option card variables', () => {
  it('styles opt-in and opt-out cards off their own variables', () => {
    expect(COMPONENT_STYLES).toMatch(
      /\.cge-input-option-opt-in \{[^}]*background-color: var\(--cge-opt-in-background-color, /,
    );
    expect(COMPONENT_STYLES).toMatch(/\.cge-input-option-opt-in \{[^}]*border-color: var\(--cge-opt-in-border-color, /);
    expect(COMPONENT_STYLES).toMatch(/\.cge-input-option-opt-in \{[^}]*border-width: var\(--cge-opt-in-border-width, /);
    expect(COMPONENT_STYLES).toMatch(
      /\.cge-input-option-opt-in \{[^}]*border-radius: var\(--cge-opt-in-border-radius, /,
    );
    expect(COMPONENT_STYLES).toMatch(
      /\.cge-input-option-opt-out \{[^}]*background-color: var\(--cge-opt-out-background-color, /,
    );
    expect(COMPONENT_STYLES).toMatch(
      /\.cge-input-option-opt-out \{[^}]*border-color: var\(--cge-opt-out-border-color, /,
    );
    expect(COMPONENT_STYLES).toMatch(
      /\.cge-input-option-opt-out \{[^}]*border-radius: var\(--cge-opt-out-border-radius, /,
    );
  });

  it('keeps an inputBody* theme reaching the cards through the fan-out master', () => {
    expect(COMPONENT_STYLES).toContain('var(--cge-opt-in-border-color, var(--cge-input-body-border-color, ');
    expect(COMPONENT_STYLES).toContain('var(--cge-opt-in-border-width, var(--cge-input-body-border-width, ');
    expect(COMPONENT_STYLES).toContain('var(--cge-opt-in-border-radius, var(--cge-input-body-border-radius, ');
    expect(COMPONENT_STYLES).toContain('var(--cge-opt-out-border-color, var(--cge-input-body-border-color, ');
    expect(COMPONENT_STYLES).toContain('var(--cge-opt-out-border-radius, var(--cge-input-body-border-radius, ');
  });

  it('declares the card rules before the selected-state rule so a selected card keeps the accent border', () => {
    const optIn = COMPONENT_STYLES.indexOf('.cge-input-option-opt-in {');
    const selected = COMPONENT_STYLES.indexOf('.cge-input-option:has(input:checked),');

    expect(optIn).toBeGreaterThan(-1);
    expect(selected).toBeGreaterThan(optIn);
  });
});

describe('defaults keep the pre-wiring rendering', () => {
  it('opt-in and opt-out borders default to the input-body values the cards always used', () => {
    expect(internalThemeDefaults.optInBorderColor).toBe(internalThemeDefaults.inputBodyBorderColor);
    expect(internalThemeDefaults.optInBorderWidth).toBe(internalThemeDefaults.inputBodyBorderWidth);
    expect(internalThemeDefaults.optInBorderRadius).toBe(internalThemeDefaults.inputBodyBorderRadius);
    expect(internalThemeDefaults.optOutBorderColor).toBe(internalThemeDefaults.inputBodyBorderColor);
    expect(internalThemeDefaults.optOutBorderRadius).toBe(internalThemeDefaults.inputBodyBorderRadius);
  });

  it('adds no fill by default to the panel or the option cards', () => {
    expect(internalThemeDefaults.panelBackgroundColor).toBe('transparent');
    expect(internalThemeDefaults.optInBackgroundColor).toBe('transparent');
    expect(internalThemeDefaults.optOutBackgroundColor).toBe('transparent');
  });

  it('keeps the header icon at 32px and the icon dark', () => {
    expect(internalThemeDefaults.headerIconSize).toBe('32px');
    expect(internalThemeDefaults.headerIconColor).toBe('#2d2d2d');
  });

  it('keeps the credibility text on the primary text colour and follows it', () => {
    expect(SEMANTIC_FAN_OUT.credibilityTextColor).toBe('primaryTextColor');
    expect(internalThemeDefaults.credibilityTextColor).toBe(internalThemeDefaults.primaryTextColor);
  });

  it('keeps the star amber by default', () => {
    expect(internalThemeDefaults.testimonialPanelStarColor.toLowerCase()).toBe('#f2b544');
  });
});

describe('header icon, credibility and star variables', () => {
  it('sizes and colours the header icon off its variables', () => {
    expect(COMPONENT_STYLES).toMatch(/\.cge-header-row \.cge-icon \{[^}]*width: var\(--cge-header-icon-size, 32px\)/);
    expect(COMPONENT_STYLES).toMatch(/\.cge-header-row \.cge-icon \{[^}]*height: var\(--cge-header-icon-size, 32px\)/);
    expect(COMPONENT_STYLES).toMatch(/\.cge-header-row \.cge-icon \{[^}]*color: var\(--cge-header-icon-color, /);
  });

  it('colours the credibility text off its variable', () => {
    expect(COMPONENT_STYLES).toMatch(
      /\.cge-sales-count-text \{[^}]*color: var\(--cge-credibility-text-color, var\(--cge-primary-text-color, /,
    );
  });

  it('colours the filled stars off currentColor', () => {
    expect(COMPONENT_STYLES).toMatch(/\.cge-star \{[^}]*color: var\(--cge-testimonial-panel-star-color, /);
  });
});

describe('panel background', () => {
  it('fills the panel off its variable', () => {
    expect(COMPONENT_STYLES).toMatch(
      /\.cg-panel \{[^}]*background-color: var\(--cge-panel-background-color, transparent\)/,
    );
  });
});
