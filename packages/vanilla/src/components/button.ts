import { ICON_REGISTRY } from '../shared/icon-registry';

export interface ButtonConfig {
  label: string;
  variant?: 'primary' | 'secondary';
  selectedLabel?: string;
}

function buildSelectedLabel(selectedLabel: string): HTMLElement {
  const el = document.createElement('span');
  el.className = 'cge-button-label-selected';

  const check = document.createElement('span');
  check.className = 'cge-button-check';
  check.setAttribute('aria-hidden', 'true');
  check.innerHTML = ICON_REGISTRY.check ?? '';

  el.appendChild(check);
  el.appendChild(document.createTextNode(selectedLabel));

  return el;
}

export function buildButton({ label, variant = 'primary', selectedLabel }: ButtonConfig): HTMLElement {
  const el = document.createElement('button');
  el.className = `cge-button${variant === 'secondary' ? ' cge-button-secondary' : ''}`;
  el.type = 'button';

  if (!selectedLabel) {
    el.textContent = label;
    return el;
  }

  // Both labels render; CSS shows one off the option's selected state (display:none hides the other from AT).
  const resting = document.createElement('span');
  resting.className = 'cge-button-label-resting';
  resting.textContent = label;

  el.classList.add('cge-button-has-selected');
  el.appendChild(resting);
  el.appendChild(buildSelectedLabel(selectedLabel));

  return el;
}
