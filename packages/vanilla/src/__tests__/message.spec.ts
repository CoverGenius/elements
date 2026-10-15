import { describe, expect, it } from 'vitest';
import { buildMessage } from '../components/message';
import { COMPONENT_STYLES } from '../styles/generated/component-styles.generated';
import { CG_ATTR } from '../shared/attributes';
import { ICON_INFO, ICON_REGISTRY } from '../shared/icon-registry';

describe('buildMessage', () => {
  it('renders a warning message with correct class', () => {
    const el = buildMessage({ kind: 'warning', content: 'Check dates' });

    expect(el.tagName).toBe('DIV');
    expect(el.className).toContain('cge-message-warning');
    expect(el.querySelector('.cge-message-text')?.textContent).toBe('Check dates');
  });

  it('renders an info message with correct class', () => {
    const el = buildMessage({ kind: 'info', content: 'FYI' });

    expect(el.className).toContain('cge-message-info');
  });

  it('renders a required message with correct class', () => {
    const el = buildMessage({ kind: 'required', content: 'Mandatory' });

    expect(el.className).toContain('cge-message-required');
  });

  it('supports only the schema trio: warning, info, required', () => {
    const kinds = ['warning', 'info', 'required'] as const;

    for (const kind of kinds) {
      const el = buildMessage({ kind, content: '' });
      expect(el.className).toContain(`cge-message-${kind}`);
    }
  });

  it('has no inline styles (styles live in the adopted stylesheet)', () => {
    const el = buildMessage({ kind: 'warning', content: '' });

    expect(el.style.length).toBe(0);
  });

  it('stylesheet defines per-kind panel variables', () => {
    for (const kind of ['warning', 'info', 'required']) {
      expect(COMPONENT_STYLES).toContain(`--cge-${kind}-panel-background-color`);
      expect(COMPONENT_STYLES).toContain(`--cge-${kind}-panel-border-color`);
      expect(COMPONENT_STYLES).toContain(`--cge-${kind}-panel-text-color`);
    }
  });

  it('sets role="alert" for warning and required messages', () => {
    const warning = buildMessage({ kind: 'warning', content: '' });
    const required = buildMessage({ kind: 'required', content: '' });

    expect(warning.getAttribute('role')).toBe('alert');
    expect(required.getAttribute('role')).toBe('alert');
  });

  it('sets role="status" for info messages', () => {
    const info = buildMessage({ kind: 'info', content: '' });

    expect(info.getAttribute('role')).toBe('status');
  });

  it('renders an icon inside the message', () => {
    const el = buildMessage({ kind: 'warning', content: 'Test' });

    const icon = el.querySelector('.cge-message-icon');

    expect(icon).not.toBeNull();
    expect(icon?.querySelector('svg')).not.toBeNull();
  });

  it('renders the configured resolved icon name when provided', () => {
    const el = buildMessage({ kind: 'info', content: 'Details', iconName: 'check' });
    const icon = el.querySelector('.cge-message-icon');

    expect(icon?.getAttribute(CG_ATTR.icon)).toBe('check');
    expect(icon?.querySelector('svg')).not.toBeNull();
  });

  it('resolves the info icon through the icon registry', () => {
    const el = buildMessage({ kind: 'info', content: 'FYI', iconName: 'info' });

    expect(ICON_REGISTRY.info).toBe(ICON_INFO);
    expect(el.querySelector('.cge-message-icon')?.getAttribute(CG_ATTR.icon)).toBe('info');
  });

  it('contains icon, body, and text child elements', () => {
    const el = buildMessage({ kind: 'info', content: 'Test' });

    expect(el.className).toContain('cge-message');
    expect(el.querySelector('.cge-message-icon')).not.toBeNull();
    expect(el.querySelector('.cge-message-body')).not.toBeNull();
    expect(el.querySelector('.cge-message-text')).not.toBeNull();
  });

  it('renders an optional title when provided', () => {
    const el = buildMessage({ kind: 'warning', content: 'Body text', title: 'Heads up' });

    const title = el.querySelector('.cge-message-title');
    expect(title).not.toBeNull();
    expect(title?.textContent).toBe('Heads up');
    expect(el.querySelector('.cge-message-text')?.textContent).toBe('Body text');
  });

  it('omits title element when title is not provided', () => {
    const el = buildMessage({ kind: 'info', content: 'Just body' });

    expect(el.querySelector('.cge-message-title')).toBeNull();
    expect(el.querySelector('.cge-message-text')?.textContent).toBe('Just body');
  });
});
