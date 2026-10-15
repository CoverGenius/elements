import { describe, expect, it } from 'vitest';

import { COMPONENT_STYLES } from '../styles/generated/component-styles.generated';
import { internalThemeDefaults, WIRE_MAPPING } from '../theme/wire-mapping';

describe('panel-shell defaults', () => {
  it('defaults padding, border, and radius to off', () => {
    expect(internalThemeDefaults.panelPadding).toBe('0');
    expect(internalThemeDefaults.panelBorderWidth).toBe('0');
    expect(internalThemeDefaults.panelBorderRadius).toBe('0');
  });

  it('bakes the panel border colour even though the border is off by default', () => {
    expect(internalThemeDefaults.panelBorderColor).toBe('#C5CAD1');
  });

  it('always sets a section gap, with a narrower gap for the header pair', () => {
    expect(internalThemeDefaults.panelSectionGap).toBe('16px');
    expect(internalThemeDefaults.panelHeaderGap).toBe('4px');
  });

  it('keeps the panel border/radius variables sdk-originated (off by default), not re-mapped to a gui token', () => {
    expect(WIRE_MAPPING.panelBorderColor.outcome).toBe('sdk-originated');
    expect(WIRE_MAPPING.panelBorderWidth.outcome).toBe('sdk-originated');
    expect(WIRE_MAPPING.panelBorderRadius.outcome).toBe('sdk-originated');
  });
});

describe('panel-shell stylesheet', () => {
  it('applies padding, border, and radius to the panel root', () => {
    expect(COMPONENT_STYLES).toContain('.cg-panel');
    expect(COMPONENT_STYLES).toContain('var(--cge-panel-padding');
    expect(COMPONENT_STYLES).toContain('var(--cge-panel-border-width');
    expect(COMPONENT_STYLES).toContain('var(--cge-panel-border-color');
    expect(COMPONENT_STYLES).toContain('var(--cge-panel-border-radius');
  });

  it('defines the inter-section gap and the narrower header gap', () => {
    expect(COMPONENT_STYLES).toContain('.cge-section + .cge-section');
    expect(COMPONENT_STYLES).toContain('var(--cge-panel-section-gap');
    expect(COMPONENT_STYLES).toContain('.cge-section-header + .cge-section-top-body');
    expect(COMPONENT_STYLES).toContain('var(--cge-panel-header-gap');
  });
});
