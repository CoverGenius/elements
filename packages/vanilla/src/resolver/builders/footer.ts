import type { NodeBuilder } from '../builder';
import type { FooterNode } from '../layout';
import { buildFooter } from '../../sections/footer';
import { boundLink, boundRichText, boundText } from '../binding';
import { resolveIconName } from '../theme-icons';

export const footerBuilder: NodeBuilder<FooterNode> = ({ node, content, theme }) => {
  const disclaimerNode = node.disclaimer;

  const isTextDisclaimer = disclaimerNode?.type === 'text';

  const disclaimer = disclaimerNode
    ? isTextDisclaimer
      ? boundText(content?.disclaimer)
      : boundRichText(content?.disclaimer)
    : undefined;

  const termsLink = isTextDisclaimer
    ? boundLink(content?.terms_link)
    : disclaimerNode
      ? undefined
      : boundLink(content?.terms_link);

  return buildFooter({
    separator: !!node.separator,
    disclaimer,
    termsLink,
    logo: node.logo
      ? {
          text: 'Powered by',
          icon: resolveIconName(theme, 'footer_logo'),
          location: node.logo.location ?? 'inline_end',
        }
      : undefined,
  });
};
