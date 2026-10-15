import { describe, expect, it } from 'vitest';

import { COMPONENT_STYLES as RAW_STYLES } from '../styles/generated/component-styles.generated';
import { internalThemeDefaults } from '../theme/wire-mapping';
import { SEMANTIC_FAN_OUT, THEMABLE_VARIABLES } from '../theme/themable-variables';

// Selector line-wrapping is a formatting detail, not part of the contract.
const COMPONENT_STYLES = RAW_STYLES.replace(/\s+/g, ' ');

const HOST = ':host([data-cg-elements-required])';
const UNSELECTED = ':not(.cge-input-option-selected):not([data-cg-selected]):not(:has(input:checked))';

describe('required state styles', () => {
  it('colours unselected options and their controls off the host attribute', () => {
    expect(COMPONENT_STYLES).toContain(`${HOST} .cge-input-option${UNSELECTED}`);
    expect(COMPONENT_STYLES).toContain(
      `${HOST} .cge-input-option${UNSELECTED} .cge-input-option-control input[type='radio']`,
    );
    expect(COMPONENT_STYLES).toContain(
      `${HOST} .cge-input-option${UNSELECTED} .cge-input-option-control input[type='checkbox']`,
    );
  });

  it('draws the checkbox with its own border so border-color applies, without any url() asset', () => {
    const checkbox = COMPONENT_STYLES.split('}').find((r) =>
      r.split('{')[0].trim().startsWith(".cge-selection-control input[type='checkbox'],"),
    );

    expect(checkbox).toContain('appearance: none');
    expect(checkbox).toContain('width: 20px');
    expect(checkbox).toContain('border: 2px solid var(--cge-selection-border-color, ');
    expect(COMPONENT_STYLES).toContain(".cge-input-option-control input[type='checkbox']:checked::after");
    expect(checkbox).not.toMatch(/url\(|data:/);
  });

  it('never targets a selected option', () => {
    const rules = COMPONENT_STYLES.split('}').filter((r) => r.includes(HOST) && r.includes('.cge-input-option'));

    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules.filter((r) => !r.includes('.cge-required-inline'))) {
      expect(rule).toContain(UNSELECTED);
    }
  });

  it('colours the required text off the host attribute', () => {
    expect(COMPONENT_STYLES).toMatch(
      /:host\(\[data-cg-elements-required\]\) \.cge-required-inline \{\s*color: var\(--cge-required-text-color, /,
    );
  });

  it('keeps the legacy .cge-input-option-error class on the same variable', () => {
    expect(COMPONENT_STYLES).toMatch(
      /\.cge-input-option-error,[\s\S]*?\{\s*border-color: var\(--cge-required-border-color, /,
    );
  });

  it('resolves the state variables through the errorColor master at runtime', () => {
    expect(COMPONENT_STYLES).toContain('var(--cge-required-text-color, var(--cge-error-color, ');
    expect(COMPONENT_STYLES).toContain('var(--cge-required-border-color, var(--cge-error-color, ');
  });

  it('declares the state variables as errorColor fan-out children, distinct from the resting panel', () => {
    expect(SEMANTIC_FAN_OUT.requiredTextColor).toBe('errorColor');
    expect(SEMANTIC_FAN_OUT.requiredBorderColor).toBe('errorColor');
    expect(THEMABLE_VARIABLES.requiredTextColor).not.toBe(THEMABLE_VARIABLES.requiredPanelTextColor);
    expect(internalThemeDefaults.requiredTextColor).toBe(internalThemeDefaults.errorColor);
    expect(internalThemeDefaults.requiredBorderColor).toBe(internalThemeDefaults.errorColor);
  });

  it('lets selectionAccentColor follow accentColor at runtime', () => {
    expect(COMPONENT_STYLES).toContain('var(--cge-selection-accent-color, var(--cge-accent-color, ');
  });
});
