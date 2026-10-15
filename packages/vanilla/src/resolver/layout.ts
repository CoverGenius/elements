/** The panel's fixed sections, rendered in this order when present. */
export type SectionName = 'header' | 'top_body' | 'input_body' | 'bottom_body' | 'footer';

export const SECTION_ORDER: readonly SectionName[] = [
  'header',
  'top_body',
  'input_body',
  'bottom_body',
  'footer',
] as const;

export type NodeType = 'default' | 'card' | 'cta' | 'block' | 'html' | 'text';

export type HeaderBadgeLocation = 'inline_start' | 'inline_end' | 'above';

export type OptInBadgeLocation =
  'resting_start' | 'resting_center' | 'resting_end' | 'above' | 'below' | 'inline_start' | 'inline_end';

export type PanelLocation = 'top' | 'middle' | 'bottom';

export type OptInPanelLocation = 'top' | 'bottom';

export type SelectionLocation = 'inline_start' | 'inline_end' | 'bottom';

export type PriceLocation = 'inline_end' | 'below';

export type CredibilityPanelLocation = 'start' | 'center' | 'end';

export type TrustpilotPanelLocation = 'inline_end' | 'below' | 'center';

export type LogoLocation = 'inline_end' | 'below';

export type InputBodyAlign = 'start' | 'center' | 'end';

export interface LeafNode<TType extends NodeType = 'default'> {
  type: TType;
  [field: string]: unknown;
}

export interface ListNode extends LeafNode {
  heading?: LeafNode;
}

export interface TermsLinkHostNode extends LeafNode {
  terms_link?: LeafNode;
}

export interface HeaderBadgeNode extends LeafNode {
  location?: HeaderBadgeLocation;
}

export interface OptInBadgeNode extends LeafNode {
  location?: OptInBadgeLocation;
}

export interface SelectionNode extends LeafNode<'default' | 'cta'> {
  location?: SelectionLocation;
}

export interface PriceNode extends LeafNode<'default' | 'block'> {
  location?: PriceLocation;
}

export interface PanelNode extends LeafNode {
  location?: PanelLocation;
}

export interface OptInPanelNode extends LeafNode {
  location?: OptInPanelLocation;
}

export interface BottomInfoPanelNode extends LeafNode {
  location?: OptInPanelLocation;
}

export interface CredibilityPanelNode extends LeafNode {
  location?: CredibilityPanelLocation;
}

export interface TrustpilotPanelNode extends LeafNode {
  location?: TrustpilotPanelLocation;
}

export interface LogoNode extends LeafNode {
  location?: LogoLocation;
}

export type HtmlDisclaimerNode = LeafNode<'default' | 'html'>;

export interface TextDisclaimerNode extends LeafNode<'default' | 'text'> {
  terms_link?: LeafNode;
}

export type DisclaimerNode = HtmlDisclaimerNode | TextDisclaimerNode;

export interface OptInNode extends LeafNode<'default' | 'card'> {
  heading?: LeafNode;
  description?: LeafNode;
  badge?: OptInBadgeNode;
  price?: PriceNode;
  benefits?: ListNode;
  inclusions?: ListNode;
  exclusions?: ListNode;
  links?: LeafNode;
  terms_link?: LeafNode;
  info_panel?: OptInPanelNode;
  warning_panel?: LeafNode;
  required_panel?: LeafNode;
}

export interface OptOutNode extends LeafNode {
  heading?: LeafNode;
  description?: LeafNode;
  warning_panel?: LeafNode;
}

export interface HeaderNode extends LeafNode {
  heading?: LeafNode;
  badge?: HeaderBadgeNode;
  icon?: LeafNode;
}

export interface TopBodyNode extends TermsLinkHostNode {
  heading?: LeafNode;
  subheading?: TermsLinkHostNode;
  benefits?: ListNode;
  inclusions?: ListNode;
  exclusions?: ListNode;
  required_panel?: PanelNode;
  info_panel?: PanelNode;
}

export interface InputBodyNode extends LeafNode {
  align?: InputBodyAlign;
  rule?: string;
  aggregate_products?: boolean;
  selection?: SelectionNode;
  opt_in?: OptInNode;
  opt_out?: OptOutNode;
}

export interface BottomBodyNode extends LeafNode {
  heading?: LeafNode;
  credibility_panel?: CredibilityPanelNode;
  testimonial_panel?: LeafNode;
  trustpilot_panel?: TrustpilotPanelNode;
  info_panel?: BottomInfoPanelNode;
}

export interface FooterNode extends TermsLinkHostNode {
  disclaimer?: DisclaimerNode;
  logo?: LogoNode;
  separator?: LeafNode;
}

/** A layout node per section; an absent section renders nothing. */
export interface Layout {
  header?: HeaderNode;
  top_body?: TopBodyNode;
  input_body?: InputBodyNode;
  bottom_body?: BottomBodyNode;
  footer?: FooterNode;
}

export type LayoutNode = HeaderNode | TopBodyNode | InputBodyNode | BottomBodyNode | FooterNode;
