import { describe, expect, it } from 'vitest';

import { SEMANTIC_FAN_OUT, THEMABLE_VARIABLES } from '../theme/themable-variables';

function camelToKebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

describe('THEMABLE_VARIABLES', () => {
  const entries = Object.entries(THEMABLE_VARIABLES);
  const wireNames = Object.keys(THEMABLE_VARIABLES);
  const cssVars = Object.values(THEMABLE_VARIABLES);

  it('contains at least the original 48 entries', () => {
    // THEMABLE_VARIABLES grows as components introduce new --cge-* properties
    // (theme.md); this only guards against the set shrinking unexpectedly.
    expect(entries.length).toBeGreaterThanOrEqual(48);
  });

  it('has no duplicate CSS variable names', () => {
    const unique = new Set(cssVars);
    expect(unique.size).toBe(cssVars.length);
  });

  it('every CSS variable starts with --cge-', () => {
    for (const cssVar of cssVars) {
      expect(cssVar).toMatch(/^--cge-/);
    }
  });

  it('every CSS variable is the kebab-case of its wire name', () => {
    for (const [wire, cssVar] of entries) {
      expect(cssVar).toBe(`--cge-${camelToKebab(wire)}`);
    }
  });

  it('every wire name is camelCase (no underscores, no leading uppercase)', () => {
    for (const wire of wireNames) {
      expect(wire).toMatch(/^[a-z][a-zA-Z]*$/);
    }
  });
});

describe('SEMANTIC_FAN_OUT', () => {
  it('selectionAccentColor fans out to accentColor', () => {
    expect(SEMANTIC_FAN_OUT.selectionAccentColor).toBe('accentColor');
  });

  it('every fan-out target exists in THEMABLE_VARIABLES', () => {
    for (const target of Object.values(SEMANTIC_FAN_OUT)) {
      expect(THEMABLE_VARIABLES).toHaveProperty(target);
    }
  });

  it('every fan-out source exists in THEMABLE_VARIABLES', () => {
    for (const source of Object.keys(SEMANTIC_FAN_OUT)) {
      expect(THEMABLE_VARIABLES).toHaveProperty(source);
    }
  });

  it('requiredTextColor and requiredBorderColor fan out to the errorColor master', () => {
    expect(SEMANTIC_FAN_OUT.requiredTextColor).toBe('errorColor');
    expect(SEMANTIC_FAN_OUT.requiredBorderColor).toBe('errorColor');
  });

  it('contains exactly the known entries', () => {
    expect(Object.keys(SEMANTIC_FAN_OUT).sort()).toEqual(
      ['requiredBorderColor', 'requiredTextColor', 'selectionAccentColor'].sort(),
    );
  });
});
