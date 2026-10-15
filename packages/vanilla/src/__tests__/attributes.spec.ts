import { describe, expect, it } from 'vitest';
import { CG_ATTR, CG_DATASET, CG_ROLE, attrSelector } from '../shared/attributes';

// These lock the attribute-name contract to exact strings, so a constant that
// silently changes value (or a typo in one) fails here rather than in the DOM.
// Consumers of the SDK read these names off the rendered DOM, so the strings are
// a contract; the specs deliberately assert literals, not the constants.

describe('CG_ATTR names', () => {
  it('maps each key to its data-cg-* attribute name', () => {
    expect(CG_ATTR).toEqual({
      role: 'data-cg-role',
      productIds: 'data-cg-product-ids',
      optionId: 'data-cg-option-id',
      rule: 'data-cg-rule',
      targetRule: 'data-cg-target-rule',
      targetAction: 'data-cg-target-action',
      selected: 'data-cg-selected',
      selectMode: 'data-cg-select-mode',
      maxSelect: 'data-cg-max-select',
      disabled: 'data-cg-disabled',
      elementsState: 'data-cg-elements-state',
      elementsRequired: 'data-cg-elements-required',
      node: 'data-cg-node',
      type: 'data-cg-type',
      badgeLocation: 'data-cg-badge-location',
      icon: 'data-cg-icon',
      benefitName: 'data-cg-benefit-name',
    });
  });
});

describe('CG_DATASET keys', () => {
  it('maps each key to its camelCase dataset property', () => {
    expect(CG_DATASET).toEqual({
      role: 'cgRole',
      productIds: 'cgProductIds',
      optionId: 'cgOptionId',
      selectMode: 'cgSelectMode',
      maxSelect: 'cgMaxSelect',
      node: 'cgNode',
      type: 'cgType',
      badgeLocation: 'cgBadgeLocation',
      icon: 'cgIcon',
      benefitName: 'cgBenefitName',
    });
  });

  it('a dataset key round-trips to its CG_ATTR name via the DOM', () => {
    const el = document.createElement('div');
    el.dataset[CG_DATASET.role] = 'option';

    expect(el.getAttribute(CG_ATTR.role)).toBe('option');
  });

  it('every CG_DATASET key maps to the matching CG_ATTR name (the two maps stay in step)', () => {
    // CG_ATTR (kebab attribute) and CG_DATASET (camelCase dataset) are two hand-
    // maintained maps for the same names; a drift would stamp one name and read
    // another. Setting each dataset key on a real element must yield its CG_ATTR
    // attribute, which is the DOM's own dataset<->attribute mapping.
    for (const key of Object.keys(CG_DATASET) as (keyof typeof CG_DATASET)[]) {
      const el = document.createElement('div');
      el.dataset[CG_DATASET[key]] = 'x';

      expect(el.getAttribute(CG_ATTR[key]), `CG_DATASET.${key} must map to CG_ATTR.${key}`).toBe('x');
    }
  });
});

describe('CG_ROLE values', () => {
  it('maps each key to its data-cg-role value', () => {
    expect(CG_ROLE).toEqual({
      option: 'option',
      decline: 'decline',
      submit: 'submit',
      selectionControl: 'selection-control',
    });
  });
});

describe('attrSelector', () => {
  it('builds a presence selector without a value', () => {
    expect(attrSelector(CG_ATTR.rule)).toBe('[data-cg-rule]');
  });

  it('builds a value selector', () => {
    expect(attrSelector(CG_ATTR.role, 'option')).toBe('[data-cg-role="option"]');
  });
});
