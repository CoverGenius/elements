import type { ResolvedContent } from '../content-types';

export interface SelectionCTAContent {
  kind: 'selection_cta';
  positiveLabel?: string;
  positiveSelectedLabel?: string;
  negativeLabel?: string;
  negativeSelectedLabel?: string;
}

export interface TopInfoPanelContent {
  kind: 'top_info_panel';
  title?: string;
  message: string;
}

export type BoundContent =
  | ResolvedContent
  | SelectionCTAContent
  | TopInfoPanelContent
  | { kind: 'price'; formatted: string; label?: string }
  | { kind: 'bundle'; entries: SectionBundle }
  | { kind: 'bundle_list'; groups: OptionGroupBundle[] };

/** A section's resolved content, keyed by child node name. */
export type SectionBundle = Record<string, NonNullable<BoundContent>>;

export interface OptionGroupBundle {
  productIds: string[];
  entries: SectionBundle;
}

export type RouteScope = 'offer' | 'product';

export type RouteVia =
  'content' | 'list' | 'extras' | 'terms_link' | 'links' | 'price' | 'testimonial' | 'selection_cta' | 'top_info_panel';

export interface NodeRoute {
  field: string;
  scope: RouteScope;
  via: RouteVia;
}

const EXTRAS_TOP_BODY_HEADING = 'top_body_heading';

const EXTRAS_BOTTOM_BODY_HEADING = 'bottom_body_heading';

const EXTRAS_BOTTOM_INFO_PANEL_MESSAGE = 'bottom_info_panel_message';

const EXTRAS_OPT_IN_INFO_PANEL_MESSAGE = 'opt_in_info_panel_message';

const EXTRAS_OPT_OUT_DESCRIPTION = 'opt_out_description';

const EXTRAS_BENEFITS_LINK = 'benefits_link_label';

const EXTRAS_CREDIBILITY_BADGE = 'credibility_badge';

const PRODUCT_CREDIBILITY_BADGE = 'credibility_badge';

const NODE_ROUTING: Record<string, NodeRoute> = {
  heading: { field: 'heading', scope: 'offer', via: 'content' },
  subheading: { field: 'sub_heading', scope: 'offer', via: 'content' },
  description: { field: 'description', scope: 'offer', via: 'content' },
  disclaimer: { field: 'disclaimer_html', scope: 'offer', via: 'content' },
  credibility_panel: { field: 'credibility_message', scope: 'offer', via: 'content' },
  testimonial_panel: { field: 'testimonial_text', scope: 'offer', via: 'testimonial' },
  required_panel: { field: 'required_message', scope: 'offer', via: 'content' },
  warning_panel: { field: 'negative_cta_warning', scope: 'offer', via: 'content' },
  badge: { field: EXTRAS_CREDIBILITY_BADGE, scope: 'offer', via: 'extras' },
  benefits: { field: 'benefits', scope: 'product', via: 'list' },
  inclusions: { field: 'inclusions', scope: 'product', via: 'list' },
  exclusions: { field: 'exclusions', scope: 'product', via: 'list' },
  benefits_link: { field: EXTRAS_BENEFITS_LINK, scope: 'offer', via: 'extras' },
  terms_link: { field: 'terms_cta', scope: 'product', via: 'terms_link' },
  links: { field: 'pds_url', scope: 'product', via: 'links' },
  price: { field: 'price_unit', scope: 'product', via: 'price' },
  selection: { field: 'selection', scope: 'offer', via: 'selection_cta' },
};

// Nodes whose field, scope, or source differs under a given section.
const SECTION_FIELD_OVERRIDE: Partial<Record<string, Record<string, NodeRoute>>> = {
  top_body: {
    heading: { field: EXTRAS_TOP_BODY_HEADING, scope: 'offer', via: 'extras' },
    info_panel: { field: 'top_info_panel', scope: 'offer', via: 'top_info_panel' },
  },
  bottom_body: {
    heading: { field: EXTRAS_BOTTOM_BODY_HEADING, scope: 'offer', via: 'extras' },
    info_panel: { field: EXTRAS_BOTTOM_INFO_PANEL_MESSAGE, scope: 'offer', via: 'extras' },
  },
  opt_in: {
    heading: { field: 'title', scope: 'product', via: 'content' },
    description: { field: 'description', scope: 'product', via: 'content' },
    badge: { field: PRODUCT_CREDIBILITY_BADGE, scope: 'product', via: 'content' },
    info_panel: { field: EXTRAS_OPT_IN_INFO_PANEL_MESSAGE, scope: 'offer', via: 'extras' },
  },
  opt_out: {
    heading: { field: 'negative_cta', scope: 'offer', via: 'content' },
    description: { field: EXTRAS_OPT_OUT_DESCRIPTION, scope: 'offer', via: 'extras' },
    warning_panel: { field: 'negative_cta_warning', scope: 'offer', via: 'content' },
  },
};

// Nodes that carry no content: their appearance comes from theme or layout,
// so they are skipped without a missing-mapping warning.
const CONTENT_FREE: ReadonlySet<string> = new Set(['icon', 'logo', 'separator', 'trustpilot_panel']);

export function isContentFree(nodeKind: string): boolean {
  return CONTENT_FREE.has(nodeKind);
}

export function routeFor(section: string, nodeKind: string, nodeType?: string): NodeRoute | undefined {
  if (section === 'footer' && nodeKind === 'disclaimer' && nodeType === 'text') {
    return { ...NODE_ROUTING.disclaimer, field: 'disclaimer' };
  }

  return SECTION_FIELD_OVERRIDE[section]?.[nodeKind] ?? NODE_ROUTING[nodeKind];
}
