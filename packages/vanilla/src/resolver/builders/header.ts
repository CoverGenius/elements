import type { NodeBuilder } from '../builder';
import type { HeaderNode } from '../layout';
import { buildHeader } from '../../sections/header';
import { resolveIconName } from '../theme-icons';

export const headerBuilder: NodeBuilder<HeaderNode> = ({ node: headerNode, content, theme }) => {
  const heading = content?.heading?.kind === 'text' ? content.heading.value : undefined;

  const badgeText = content?.badge?.kind === 'text' ? content.badge.value : undefined;

  return buildHeader({
    heading,
    icon: headerNode.icon ? resolveIconName(theme, 'header') : undefined,
    badge: badgeText ? { label: badgeText, location: headerNode.badge?.location ?? 'inline_end' } : undefined,
  });
};
