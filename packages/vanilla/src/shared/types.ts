import type { CurrencyFormatOptions } from './currency-formatter';
import type { Layout } from '../resolver/layout';

export type Scheme = 'light' | 'dark';

export type OverrideValue = string | { light: string; dark?: string };

export interface ThemeProfile {
  partner?: Record<string, OverrideValue>;
  overrides?: Record<string, OverrideValue>;
  icons?: { default?: string; [contentKey: string]: string | undefined };
}

export interface RegisterElementsConfig {
  environment: 'production' | 'staging' | 'sandbox';
  currencyConfig?: CurrencyFormatOptions;
  debug?: boolean;
  scheme?: Scheme;
}

export interface PresentationProfile {
  schema_version: string;
  ref: string;
  slug?: string;
  layout: Layout;
  theme?: ThemeProfile;
}

export interface FinanceComponent {
  total_amount: number | null;
  total_amount_formatted: string | null;
  [field: string]: unknown;
}

/** `total_amount` is the raw major-unit premium the resolver sums and formats. */
export interface ProductPrice extends FinanceComponent {
  total_amount_without_tax: number | null;
  total_amount_without_tax_formatted: string | null;
  total_amount_min: number | null;
  total_amount_min_formatted: string | null;
  total_amount_max: number | null;
  total_amount_max_formatted: string | null;
}

export interface ProductTax extends FinanceComponent {
  breakdown?: unknown[] | null;
}

export interface ProductFinance {
  price?: ProductPrice;
  tax?: ProductTax;
  surcharge?: FinanceComponent;
  commission?: FinanceComponent;
  [field: string]: unknown;
}

export interface ProductDetails {
  policy_version_id?: string;
  start_date?: string | null;
  end_date?: string | null;
  finance?: ProductFinance;
  pds_url?: string;
  files?: unknown[];
  extra_fields?: Record<string, unknown>;
  experiment?: Record<string, unknown>;
  benefits?: unknown[];
  price_guardrail_lower_bound?: number;
  price_guardrail_upper_bound?: number;
  [field: string]: unknown;
}

export interface Product {
  id: string;
  product_config_id?: string;
  name?: string;
  type?: string | null;
  schema_url?: string | null;
  details?: ProductDetails;
  [field: string]: unknown;
}

/** A reaction on a selection group: run `action` on `target_rule` when `on` occurs. */
export interface SelectionEvent {
  on: 'select' | 'deselect' | 'accept' | 'decline';
  action: 'show' | 'hide' | 'enable' | 'disable';
  target_rule: string;
}

export interface ProductRule {
  slug: string;
  product_ids: string[];
  initial_state: 'show' | 'hide' | 'disable';
  min_select: number;
  max_select: number;
  events?: SelectionEvent[];
}

export interface OfferResponse {
  id: string;
  offer_config_id: string;
  offer_schema: string;
  currency: string;
  products: Product[];
  product_rules?: ProductRule[];
  content: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  errors?: Record<string, unknown>;
  presentation: PresentationProfile | Record<string, never>;
}

export interface ChangeEventDetail {
  selectedOption: string;
  selectedProductIDs: string[];
  declined?: boolean;
}

export type PresentationErrorCode =
  'presentation_empty' | 'presentation_malformed' | 'schema_version_unsupported' | 'not_registered';

export interface ErrorEventDetail {
  code: PresentationErrorCode | (string & {});
  message: string;
}

export type ElementEventMap = {
  ready: void;
  change: ChangeEventDetail;
  error: ErrorEventDetail;
};

export interface SelectionApi {
  set(optionId: string): void;
  reset(): void;
  get(): string | null;
  getAll(): string[];
  required(): void;
}
