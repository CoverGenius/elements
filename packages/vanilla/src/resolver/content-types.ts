/**
 * A resolved icon name for a list item. The resolver looks this up from
 * `theme.icons[name]`; the actual asset/rendering is the Theme Converter's.
 */
export type IconName = string;

export interface ResolvedListItem {
  name: string;
  text: string;
  icon?: IconName;
}

export interface LinkItem {
  href: string;
  label: string;
}

export interface TestimonialData {
  text: string;
  rating?: string;
  author?: string;
  date?: string;
}

/**
 * What a builder receives for one node's content, already routed and joined.
 * `richText` carries a reconstructed DOM fragment, never a raw string, so no
 * wire HTML reaches a builder unparsed. `undefined` means the node is present
 * but has no content: the builder falls back to its documented default.
 */
export type ResolvedContent =
  | { kind: 'text'; value: string }
  | { kind: 'richText'; nodes: DocumentFragment }
  | { kind: 'list'; heading?: string; items: ResolvedListItem[] }
  | { kind: 'link'; href: string; label: string }
  | { kind: 'links'; links: LinkItem[] }
  | { kind: 'testimonial'; testimonial: TestimonialData }
  | undefined;

export interface ContentExtras {
  order_total_price?: string;
  top_body_heading?: string;
  benefits_heading?: string;
  inclusions_heading?: string;
  exclusions_heading?: string;
  credibility_badge?: string;
  top_info_panel_title?: string;
  top_info_panel_message?: string;
  opt_in_info_panel_message?: string;
  bottom_info_panel_message?: string;
  bottom_body_heading?: string;
  testimonial_text?: string;
  testimonial_rating?: string;
  testimonial_author?: string;
  testimonial_date?: string;
  opt_out_description?: string;
  benefits_link_label?: string;
  ipid_url?: string;
  ipid_label?: string;
  terms_cta?: string;
  positive_cta_selected?: string;
  negative_cta_selected?: string;
  [key: string]: string | undefined;
}

export interface OfferLevelContent {
  title?: string;
  description?: string;
  heading?: string;
  sub_heading?: string;
  disclaimer?: string;
  disclaimer_html?: string;
  positive_cta?: string;
  negative_cta?: string;
  negative_cta_warning?: string;
  credibility_message?: string;
  required_message?: string;
  price_unit?: string;
  extras?: ContentExtras;
  [key: string]: unknown;
}

/** Product-level content for one quote, joined by `id` against `products[]`/`product_rules`. */
export interface ProductContent {
  id: string;
  title?: string;
  description?: string;
  benefits?: Record<string, string>;
  inclusions?: Record<string, string>;
  exclusions?: Record<string, string>;
  disclaimer?: string;
  disclaimer_html?: string;
  terms_cta?: string;
  terms_cta_html?: string;
  credibility_badge?: string;
  [key: string]: unknown;
}

export type ContentScope = { kind: 'offer'; content: OfferLevelContent } | { kind: 'product'; content: ProductContent };
