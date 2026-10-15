import { describe, expect, it } from 'vitest';

import { sdkOriginatedDefaults } from '../theme/sdk-originated-defaults';
import { SEMANTIC_FAN_OUT, THEMABLE_VARIABLES } from '../theme/themable-variables';
import { internalThemeDefaults, WIRE_MAPPING } from '../theme/wire-mapping';
import type { Outcome } from '../theme/wire-mapping';

describe('internalThemeDefaults fitness check', () => {
  const themableKeys = Object.keys(THEMABLE_VARIABLES) as Array<keyof typeof THEMABLE_VARIABLES>;

  it('every themable variable has a non-empty value', () => {
    for (const variable of themableKeys) {
      const value = internalThemeDefaults[variable];
      expect(value, `missing entry for ${variable}`).toBeDefined();
      expect(value, `empty value for ${variable}`).toBeTruthy();
    }
  });

  it('fan-out variables resolve to the same value as their target', () => {
    for (const [variable, target] of Object.entries(SEMANTIC_FAN_OUT)) {
      expect(
        internalThemeDefaults[variable as keyof typeof internalThemeDefaults],
        `${variable} should resolve to ${target}'s value`,
      ).toBe(internalThemeDefaults[target as keyof typeof internalThemeDefaults]);
    }
  });
});

describe('WIRE_MAPPING completeness', () => {
  const mappingKeys = Object.keys(WIRE_MAPPING);
  const themableKeys = Object.keys(THEMABLE_VARIABLES);

  it('covers every themable variable, no more, no less', () => {
    expect(new Set(mappingKeys)).toEqual(new Set(themableKeys));
  });

  it('every row has a valid outcome', () => {
    const validOutcomes: Outcome[] = ['component', 'semantic', 'sdk-originated', 'fan-out'];
    for (const [key, row] of Object.entries(WIRE_MAPPING)) {
      expect(validOutcomes, `invalid outcome for ${key}: ${row.outcome}`).toContain(row.outcome);
    }
  });

  it('every sourced row has a non-empty value', () => {
    for (const [key, row] of Object.entries(WIRE_MAPPING)) {
      if (row.outcome === 'fan-out' || row.outcome === 'sdk-originated') continue;
      expect(row.value, `empty value for ${key}`).toBeTruthy();
    }
  });

  it('every sdk-originated row has a matching entry in sdkOriginatedDefaults', () => {
    for (const [key, row] of Object.entries(WIRE_MAPPING)) {
      if (row.outcome !== 'sdk-originated') continue;
      const variable = key as keyof typeof sdkOriginatedDefaults;
      expect(
        sdkOriginatedDefaults[variable],
        `sdk-originated variable "${key}" missing from sdkOriginatedDefaults`,
      ).toBeDefined();
      expect(sdkOriginatedDefaults[variable], `empty sdk-originated value for ${key}`).toBeTruthy();
    }
  });

  it('every fan-out variable has a matching entry in SEMANTIC_FAN_OUT whose target exists in WIRE_MAPPING', () => {
    for (const [key, row] of Object.entries(WIRE_MAPPING)) {
      if (row.outcome !== 'fan-out') continue;
      const target = SEMANTIC_FAN_OUT[key as keyof typeof SEMANTIC_FAN_OUT];
      expect(target, `fan-out variable "${key}" missing from SEMANTIC_FAN_OUT`).toBeDefined();
      expect(
        WIRE_MAPPING[target as keyof typeof WIRE_MAPPING],
        `fan-out target "${target}" missing from WIRE_MAPPING`,
      ).toBeDefined();
    }
  });

  it('documents at least one ambiguity with rejected alternative', () => {
    const ambiguousRows = Object.values(WIRE_MAPPING).filter((row) => row.notes && /rejected/i.test(row.notes));
    expect(ambiguousRows.length).toBeGreaterThanOrEqual(1);
  });
});
