import type { SdkContext } from '../shared/context';
import type { Product } from '../shared/types';

/**
 * One rendered option. `productIds` holds every quote id the option represents,
 * in offer order. `representative` is the member whose content the option shows.
 */
export interface ProductGroup {
  productIds: string[];
  representative: Product;
  members: Product[];
}

/**
 * Groups products into options. When `aggregate` is false, each product is its
 * own option. When true, products sharing a `product_config_id` collapse into
 * one option in first-seen order; a product without a `product_config_id` stays
 * its own option. Every quote id is retained on the group either way.
 */
export function groupProducts(products: Product[], aggregate: boolean): ProductGroup[] {
  if (!aggregate) {
    return products.map((p) => ({ productIds: [p.id], representative: p, members: [p] }));
  }

  const groups: ProductGroup[] = [];

  const byConfigId = new Map<string, ProductGroup>();

  for (const product of products) {
    const configId = product.product_config_id;

    const existing = configId ? byConfigId.get(configId) : undefined;

    if (existing) {
      existing.productIds.push(product.id);

      existing.members.push(product);

      continue;
    }

    const group: ProductGroup = { productIds: [product.id], representative: product, members: [product] };

    groups.push(group);

    if (configId) byConfigId.set(configId, group);
  }

  return groups;
}

/**
 * Sums the group's `total_amount` as a raw number. Members with no numeric
 * amount are skipped; when none has one, returns `undefined`.
 */
export function sumGroupPremiumAmount(group: ProductGroup, ctx: SdkContext): number | undefined {
  let total = 0;

  let seen = 0;

  for (const product of group.members) {
    const amount = product.details?.finance?.price?.total_amount;

    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      ctx.logger.debug('sumGroupPremium: missing or non-numeric total_amount', { id: product.id });

      continue;
    }

    total += amount;

    seen += 1;
  }

  if (seen === 0) return undefined;

  return total;
}

/**
 * Sums the group's `total_amount` and formats the total in `currency`.
 * Members with no numeric amount are skipped; when none has one, returns `undefined`.
 */
export function sumGroupPremium(group: ProductGroup, currency: string, ctx: SdkContext): string | undefined {
  const total = sumGroupPremiumAmount(group, ctx);

  if (total === undefined) return undefined;

  return ctx.currency.format(total, currency);
}
