import { buildMessage } from '../components/message';
import { resolveIcon } from '../components/icon';
import { ICON_REGISTRY } from '../shared/icon-registry';
import { PanelLocation } from './top-body';

export interface TestimonialConfig {
  text: string;
  rating?: number;
  author?: string;
  date?: string;
}

export interface TrustpilotConfig {
  score: number;
  label: string;
}

export interface SalesCountConfig {
  text: string;
}

export interface BottomBodyConfig {
  heading?: string;
  testimonial?: TestimonialConfig;
  trustpilot?: TrustpilotConfig;
  salesCount?: SalesCountConfig;
  infoMessage?: { content: string; location?: PanelLocation };
}

const MAX_STARS = 5;

function buildStars(rating: number): HTMLElement {
  const container = document.createElement('div');
  container.className = 'cge-stars';
  container.setAttribute('aria-label', `${rating} out of 5 stars`);

  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  for (let i = 0; i < MAX_STARS; i++) {
    const star = document.createElement('span');
    star.className = 'cge-star';
    star.setAttribute('aria-hidden', 'true');
    if (i < fullStars) {
      star.innerHTML = ICON_REGISTRY['star-yellow'] ?? '';
    } else if (i === fullStars && hasHalf) {
      star.classList.add('cge-star-half');
      star.innerHTML = ICON_REGISTRY['star-yellow'] ?? '';
    } else {
      star.innerHTML = ICON_REGISTRY['star-hollow'] ?? '';
    }
    container.appendChild(star);
  }

  return container;
}

function buildTestimonial(config: TestimonialConfig): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'cge-testimonial-panel';

  const variant = config.rating !== undefined ? 'rated' : 'plain';
  panel.classList.add(`cge-testimonial-${variant}`);

  const quote = document.createElement('div');
  const quoteText = document.createElement('p');
  quote.className = 'cge-testimonial-quote';
  quoteText.textContent = `“${config.text}”`;
  quote.appendChild(quoteText);
  panel.appendChild(quote);

  const footer = document.createElement('div');
  footer.className = 'cge-testimonial-footer';

  if (config.rating !== undefined) {
    footer.appendChild(buildStars(config.rating));
  }

  const attribution = [config.author, config.date].filter(Boolean).join(' · ');
  if (attribution) {
    const cite = document.createElement('cite');
    cite.className = 'cge-testimonial-cite';
    cite.textContent = attribution;
    footer.appendChild(cite);
  }

  if (footer.childNodes.length > 0) {
    quote.appendChild(footer);
  }

  return panel;
}

function buildTrustpilotStars(score: number): HTMLElement {
  const container = document.createElement('div');
  container.className = 'cge-trustpilot-stars';

  const fullStars = Math.floor(score);
  const hasHalf = score - fullStars >= 0.5;

  for (let i = 0; i < MAX_STARS; i++) {
    const box = document.createElement('span');
    box.className = 'cge-trustpilot-star-box';

    if (i < fullStars) {
      box.innerHTML = ICON_REGISTRY['star-hollow'] ?? '';
    } else if (i === fullStars && hasHalf) {
      box.classList.add('cge-trustpilot-star-half');
      box.innerHTML = ICON_REGISTRY['star-hollow'] ?? '';
    } else {
      box.classList.add('cge-trustpilot-star-empty');
      box.innerHTML = ICON_REGISTRY['star-hollow'] ?? '';
    }

    container.appendChild(box);
  }

  return container;
}

function buildTrustpilot(config: TrustpilotConfig): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'cge-trustpilot-panel';

  const logo = resolveIcon({ name: 'star', decorative: true });
  logo.className = 'cge-trustpilot-logo';
  panel.appendChild(logo);
  const subTitle = document.createElement('span');
  subTitle.className = 'cge-trustpilot-subtitle';
  subTitle.textContent = 'Trustpilot';
  panel.appendChild(subTitle);
  panel.appendChild(buildTrustpilotStars(config.score));

  const label = document.createElement('span');
  label.className = 'cge-trustpilot-rating';
  label.textContent = config.label;
  panel.appendChild(label);

  return panel;
}

function buildSalesCount(config: SalesCountConfig): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'cge-sales-count-panel';

  const icon = resolveIcon({ name: 'user-group', decorative: true });
  icon.className = 'cge-sales-count-icon';
  panel.appendChild(icon);

  const text = document.createElement('span');
  text.className = 'cge-sales-count-text';
  text.textContent = config.text;
  panel.appendChild(text);

  return panel;
}

export function buildBottomBody(config: BottomBodyConfig): HTMLElement {
  const el = document.createElement('section');
  el.className = 'cge-section cge-section-bottom-body';

  if (config.heading) {
    const label = document.createElement('span');
    label.className = 'cge-bottom-body-heading';
    label.textContent = config.heading;
    el.appendChild(label);
  }

  if (config.infoMessage?.location === 'top') {
    el.appendChild(buildMessage({ kind: 'info', content: config.infoMessage.content }));
  }

  if (config.testimonial) el.appendChild(buildTestimonial(config.testimonial));
  if (config.trustpilot) el.appendChild(buildTrustpilot(config.trustpilot));
  if (config.salesCount) el.appendChild(buildSalesCount(config.salesCount));

  if (config.infoMessage && (config.infoMessage.location ?? 'bottom') === 'bottom') {
    el.appendChild(buildMessage({ kind: 'info', content: config.infoMessage.content }));
  }

  return el;
}
