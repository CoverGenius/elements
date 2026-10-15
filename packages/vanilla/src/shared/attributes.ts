/** The attribute names the SDK stamps and reads. Values live in their own vocabularies (CG_ROLE, SelectionEvent, PanelState). */
export const CG_ATTR = {
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
} as const;

/** The camelCase `dataset` keys for the names a builder stamps via `el.dataset.*`. */
export const CG_DATASET = {
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
} as const;

/** The `data-cg-role` values. Both the stamping and reading sides use these, so they cannot drift; additive. */
export const CG_ROLE = {
  option: 'option',
  decline: 'decline',
  submit: 'submit',
  selectionControl: 'selection-control',
} as const;

export type CgRole = (typeof CG_ROLE)[keyof typeof CG_ROLE];

/** `value` is interpolated unescaped, so it must be a trusted internal constant, never wire or user input. */
export function attrSelector(name: string, value?: string): string {
  return value === undefined ? `[${name}]` : `[${name}="${value}"]`;
}
