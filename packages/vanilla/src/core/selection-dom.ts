import { CG_ATTR } from '../shared/attributes';

export function parseProductIds(raw: string | null): string[] {
  return raw ? raw.split(/\s+/).filter(Boolean) : [];
}

export function matchesOption(el: HTMLElement, optionId: string): boolean {
  return el.getAttribute(CG_ATTR.optionId) === optionId;
}
