import type { NodeBuilder } from '../builder';
import { buildInputBody, type InputBodyOption } from '../../sections/input-body';
import type { ListItem } from '../../components/list';
import type { InputBodyNode } from '../layout';
import type { SectionBundle } from '../binding';
import { boundText, boundLink, boundLinks, boundList, boundPrice, boundBundle, boundBundleList } from '../binding';
import { boundSelectionCta } from '../binding/bound-content';

function benefitItems(entries: SectionBundle): ListItem[] | undefined {
  return boundList(entries.benefits)?.items;
}

export const inputBodyBuilder: NodeBuilder<InputBodyNode> = ({ node, content, selection: selectionBehavior }) => {
  const isCta = node.selection?.type === 'cta';

  const control: InputBodyOption['control'] = isCta ? 'cta' : (selectionBehavior?.control ?? 'radio');

  const multiple = selectionBehavior?.multiple ?? false;

  const ctaLabels = boundSelectionCta(content?.selection);

  const badgeLocation = node.opt_in?.badge?.location;

  const optInGroups = boundBundleList(content?.opt_in) ?? [];

  const options: InputBodyOption[] = optInGroups.map((group, i) => {
    const e = group.entries;

    const priceContent = boundPrice(e.price);

    const price = priceContent
      ? {
          ...priceContent,
          type: node.opt_in?.price?.type ?? 'default',
          location: node.opt_in?.price?.location ?? 'inline_end',
        }
      : undefined;

    const termsLink = boundLink(e.terms_link);

    const links = boundLinks(e.links);

    const infoPanelText = boundText(e.info_panel);

    const badgeText = boundText(e.badge);

    const heading = boundText(e.heading);

    return {
      control,
      name: 'cg-input-body',
      value: group.productIds.join('-'),
      optionId: `opt_in_${i + 1}`,
      label: heading ?? '',
      productIds: group.productIds,
      description: boundText(e.description),
      benefits: benefitItems(e),
      inclusions: boundList(e.inclusions)?.items,
      exclusions: boundList(e.exclusions)?.items,
      price,
      links,
      termsLink,
      infoPanel: infoPanelText
        ? { content: infoPanelText, location: node.opt_in?.info_panel?.location ?? 'bottom' }
        : undefined,
      badge: badgeText ? { label: badgeText, location: badgeLocation } : undefined,
      buttonLabel: isCta ? ctaLabels?.positiveLabel : undefined,
      buttonSelectedLabel: isCta ? ctaLabels?.positiveSelectedLabel : undefined,
    };
  });

  const optOut = boundBundle(content?.opt_out);

  if (node.opt_out && optOut) {
    options.push({
      control: isCta ? 'cta' : 'radio',
      name: 'cg-input-body',
      value: 'decline',
      optionId: 'opt_out',
      label: boundText(optOut.heading) ?? '',
      productIds: [],
      description: boundText(optOut.description),
      warningMessage: boundText(optOut.warning_panel),
      decline: true,
      collapsed: true,
      buttonLabel: isCta ? ctaLabels?.negativeLabel : undefined,
      buttonSelectedLabel: isCta ? ctaLabels?.negativeSelectedLabel : undefined,
    });
  }

  const isCardLayout = node.opt_in?.type === 'card';

  return buildInputBody({
    options,
    layout: isCardLayout ? 'side_by_side' : 'stacked',
    textAlign: node.opt_in?.align === 'center' ? 'center' : 'start',
    selectionLocation: node.selection?.location,
    multiple,
    maxSelect: selectionBehavior?.maxSelect,
  });
};
