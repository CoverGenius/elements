import { buildTermsLink } from '../components/terms-link';
import { resolveIcon } from '../components/icon';
import type { LogoLocation } from '../resolver/layout';

export interface FooterLogo {
  text: string;
  brand?: string;
  icon?: string;
  location?: LogoLocation;
}

export interface FooterConfig {
  separator?: boolean;
  disclaimer?: string | DocumentFragment;
  termsLink?: { href: string; label: string };
  logo?: FooterLogo;
}

export function buildFooter(config: FooterConfig): HTMLElement {
  const el = document.createElement('section');
  el.className = 'cge-section cge-section-footer';

  if (config.separator) {
    const hr = document.createElement('hr');
    hr.className = 'cge-footer-separator';
    el.appendChild(hr);
  }

  const content = document.createElement('div');
  const logoBelow = config.logo?.location === 'below';
  content.className = logoBelow ? 'cge-footer-content cge-footer-content-stacked' : 'cge-footer-content';

  if (config.disclaimer) {
    const disc = document.createElement('div');
    disc.className = 'cge-footer-disclaimer';

    if (typeof config.disclaimer === 'string') {
      const p = document.createElement('p');
      p.textContent = config.disclaimer;
      if (config.termsLink) {
        p.append(' ', buildTermsLink(config.termsLink));
      }
      disc.appendChild(p);
    } else {
      disc.appendChild(config.disclaimer.cloneNode(true));
      if (config.termsLink) {
        const lastP = disc.querySelector('p:last-of-type');
        if (lastP) {
          lastP.append(' ', buildTermsLink(config.termsLink));
        } else {
          disc.append(' ', buildTermsLink(config.termsLink));
        }
      }
    }

    content.appendChild(disc);
  } else if (config.termsLink) {
    content.appendChild(buildTermsLink(config.termsLink));
  }

  if (config.logo) {
    const logo = document.createElement('div');
    logo.className = logoBelow ? 'cge-footer-logo cge-footer-logo-below' : 'cge-footer-logo';

    const text = document.createElement('span');
    text.className = 'cge-footer-logo-text';
    text.textContent = config.logo.text;
    logo.appendChild(text);

    if (config.logo.icon) {
      const iconEl = resolveIcon({ name: config.logo.icon, decorative: true });
      iconEl.className = 'cge-footer-logo-icon';
      logo.appendChild(iconEl);
    } else if (config.logo.brand) {
      const brand = document.createElement('span');
      brand.className = 'cge-footer-logo-brand';
      brand.textContent = config.logo.brand;
      logo.appendChild(brand);
    }

    content.appendChild(logo);
  }

  el.appendChild(content);

  return el;
}
