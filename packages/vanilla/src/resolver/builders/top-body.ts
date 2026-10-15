import type { NodeBuilder } from '../builder';
import type { TopBodyNode } from '../layout';
import { buildTopBody } from '../../sections/top-body';
import { boundText, boundLink, boundList, boundTopInfoPanel } from '../binding';
import { resolveIconName } from '../theme-icons';

export const topBodyBuilder: NodeBuilder<TopBodyNode> = ({ node, content, theme }) => {
  const termsLink = boundLink(content?.terms_link);

  const requiredMessage = boundText(content?.required_panel);

  const boundInfoPanel = boundTopInfoPanel(content?.info_panel);

  const requiredPanel = requiredMessage
    ? { content: requiredMessage, location: node.required_panel?.location ?? 'bottom' }
    : undefined;

  const infoPanel = boundInfoPanel
    ? {
        content: boundInfoPanel.message,
        ...(boundInfoPanel.title ? { title: boundInfoPanel.title } : {}),
        iconName: resolveIconName(theme, 'top_info_panel'),
        location: node.info_panel?.location ?? 'bottom',
      }
    : undefined;

  return buildTopBody({
    heading: boundText(content?.heading),
    subheading: boundText(content?.subheading),
    termsLink,
    benefits: boundList(content?.benefits),
    inclusions: boundList(content?.inclusions),
    exclusions: boundList(content?.exclusions),
    requiredPanel,
    infoMessage: infoPanel,
  });
};
