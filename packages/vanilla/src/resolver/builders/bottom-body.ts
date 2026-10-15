import type { NodeBuilder } from '../builder';
import type { BottomBodyNode } from '../layout';
import { buildBottomBody } from '../../sections/bottom-body';
import { boundText, boundTestimonial } from '../binding';

const TRUSTPILOT_DEFAULT = { score: 4.5, label: 'Excellent' };

export const bottomBodyBuilder: NodeBuilder<BottomBodyNode> = ({ node, content }) => {
  const testimonial = boundTestimonial(content?.testimonial_panel);

  const credibility = boundText(content?.credibility_panel);

  const infoPanel = boundText(content?.info_panel);

  return buildBottomBody({
    heading: boundText(content?.heading),
    testimonial: testimonial
      ? {
          text: testimonial.text,
          rating: testimonial.rating ? Number(testimonial.rating) : undefined,
          author: testimonial.author,
          date: testimonial.date,
        }
      : undefined,
    salesCount: credibility ? { text: credibility } : undefined,
    trustpilot: node.trustpilot_panel ? TRUSTPILOT_DEFAULT : undefined,
    infoMessage: infoPanel ? { content: infoPanel, location: node.info_panel?.location ?? 'bottom' } : undefined,
  });
};
