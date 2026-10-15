import type {
  BoundContent,
  SectionBundle,
  OptionGroupBundle,
  SelectionCTAContent,
  TopInfoPanelContent,
} from './routing';
import type { TestimonialData } from '../content-types';

export function boundText(c: BoundContent | undefined): string | undefined {
  return c?.kind === 'text' ? c.value : undefined;
}

export function boundLink(c: BoundContent | undefined): { href: string; label: string } | undefined {
  return c?.kind === 'link' ? { href: c.href, label: c.label } : undefined;
}

export function boundLinks(c: BoundContent | undefined): { href: string; label: string }[] | undefined {
  return c?.kind === 'links' ? c.links : undefined;
}

export function boundList(
  c: BoundContent | undefined,
): { heading?: string; items: { name: string; text: string; icon?: string }[] } | undefined {
  return c?.kind === 'list' ? { heading: c.heading, items: c.items } : undefined;
}

export function boundPrice(c: BoundContent | undefined): { formatted: string; label?: string } | undefined {
  return c?.kind === 'price' ? { formatted: c.formatted, label: c.label } : undefined;
}

export function boundTestimonial(c: BoundContent | undefined): TestimonialData | undefined {
  return c?.kind === 'testimonial' ? c.testimonial : undefined;
}

export function boundBundle(c: BoundContent | undefined): SectionBundle | undefined {
  return c?.kind === 'bundle' ? c.entries : undefined;
}

export function boundRichText(c: BoundContent | undefined): DocumentFragment | undefined {
  return c?.kind === 'richText' ? c.nodes : undefined;
}

export function boundBundleList(c: BoundContent | undefined): OptionGroupBundle[] | undefined {
  return c?.kind === 'bundle_list' ? c.groups : undefined;
}

export function boundSelectionCta(c: BoundContent | undefined): SelectionCTAContent | undefined {
  return c?.kind === 'selection_cta' ? c : undefined;
}

export function boundTopInfoPanel(c: BoundContent | undefined): TopInfoPanelContent | undefined {
  return c?.kind === 'top_info_panel' ? c : undefined;
}
