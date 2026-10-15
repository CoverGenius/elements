import { ICON_WARNING, ICON_INFO, ICON_ERROR } from '../shared/icon-registry';
import { resolveIcon } from './icon';

export type MessageKind = 'warning' | 'info' | 'required';

export interface MessageConfig {
  kind: MessageKind;
  content: string;
  title?: string;
  iconName?: string;
}

const MESSAGE_ICONS: Record<MessageKind, string> = {
  warning: ICON_WARNING,
  info: ICON_INFO,
  required: ICON_ERROR,
};

export function buildMessage({ kind, content, title, iconName }: MessageConfig): HTMLElement {
  const el = document.createElement('div');
  el.className = `cge-message cge-message-${kind}`;
  el.setAttribute('role', kind === 'warning' || kind === 'required' ? 'alert' : 'status');

  const icon = iconName ? resolveIcon({ name: iconName, decorative: true }) : document.createElement('span');
  icon.classList.add('cge-message-icon');
  if (!iconName) icon.innerHTML = MESSAGE_ICONS[kind];
  el.appendChild(icon);

  const body = document.createElement('div');
  body.className = 'cge-message-body';

  if (title) {
    const titleEl = document.createElement('span');
    titleEl.className = 'cge-message-title';
    titleEl.textContent = title;
    body.appendChild(titleEl);
  }

  const text = document.createElement('span');
  text.className = 'cge-message-text';
  text.textContent = content;
  body.appendChild(text);

  el.appendChild(body);

  return el;
}
