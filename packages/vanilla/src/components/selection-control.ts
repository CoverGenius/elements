import { CG_DATASET, CG_ROLE } from '../shared/attributes';

export type ControlType = 'radio' | 'checkbox';

export interface SelectionControlConfig {
  control: ControlType;
  name: string;
  value: string;
  label: string;
  productIds: string[];
  checked?: boolean;
}

export function buildSelectionControl({
  control,
  name,
  value,
  label: labelText,
  productIds,
  checked = false,
}: SelectionControlConfig): HTMLElement {
  const wrapper = document.createElement('label');
  wrapper.className = `cge-selection-control cge-selection-${control}`;
  wrapper.dataset[CG_DATASET.role] = CG_ROLE.selectionControl;
  wrapper.dataset[CG_DATASET.productIds] = productIds.join(' ');

  const input = document.createElement('input');
  input.type = control;
  input.name = name;
  input.id = `${name}-${value}`;
  input.value = value;
  input.checked = checked;

  const span = document.createElement('span');
  span.textContent = labelText;

  wrapper.appendChild(input);
  wrapper.appendChild(span);
  return wrapper;
}
