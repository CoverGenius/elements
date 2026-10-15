export interface TermsLinkConfig {
  href: string;
  label: string;
}

export function buildTermsLink({ href, label }: TermsLinkConfig): HTMLElement {
  const el = document.createElement('a');

  el.className = 'cge-terms-link';
  el.href = href;
  el.textContent = label;
  el.target = '_blank';
  el.rel = 'noopener noreferrer';

  return el;
}
