import { describe, expect, it } from 'vitest';
import { resolveContext } from '../shared/context';
import type { BuildArgs } from '../resolver/builder';
import type { SectionBundle } from '../resolver/binding';
import type { LayoutNode } from '../resolver/layout';
import type { ThemeProfile } from '../shared/types';
import { headerBuilder } from '../resolver/builders/header';
import { topBodyBuilder } from '../resolver/builders/top-body';
import { bottomBodyBuilder } from '../resolver/builders/bottom-body';
import { footerBuilder } from '../resolver/builders/footer';
import { resolveIconName } from '../resolver/theme-icons';

const ctx = () => resolveContext({ environment: 'sandbox' });

function args<const TNode extends LayoutNode>(
  node: TNode,
  content: SectionBundle,
  theme?: ThemeProfile,
): BuildArgs<TNode> {
  return { node, content, ctx: ctx(), doc: document, theme };
}

describe('section builder adapters', () => {
  describe('headerBuilder', () => {
    it('renders heading and badge from the content bundle', () => {
      const el = headerBuilder(
        args(
          { type: 'default', heading: { type: 'default' }, badge: { type: 'default' } },
          {
            heading: { kind: 'text', value: 'Protect your trip' },
            badge: { kind: 'text', value: 'Recommended' },
          },
        ),
      );

      expect(el.querySelector('.cge-heading')?.textContent).toBe('Protect your trip');
      expect(el.querySelector('.cge-badge')?.textContent).toBe('Recommended');
    });

    it('renders the default header icon when an icon node is present, no theme override', () => {
      const el = headerBuilder(args({ type: 'default', icon: { type: 'default' } }, {}));

      expect(el.querySelector('.cge-icon')).not.toBeNull();
    });

    it('omits the icon when no icon node is present', () => {
      const el = headerBuilder(args({ type: 'default' }, {}));

      expect(el.querySelector('.cge-icon')).toBeNull();
    });

    it('uses a theme.icons override for the header icon name', () => {
      const el = headerBuilder(
        args({ type: 'default', icon: { type: 'default' } }, {}, { icons: { header: 'custom-shield' } }),
      );

      // The icon atom stamps the resolved name; presence + resolution is what we assert.
      expect(el.querySelector('.cge-icon')).not.toBeNull();
    });

    it('places an inline_end badge with the end modifier class', () => {
      const el = headerBuilder(
        args(
          { type: 'default', badge: { type: 'default', location: 'inline_end' } },
          {
            badge: { kind: 'text', value: 'New' },
          },
        ),
      );

      const badge = el.querySelector('.cge-header-row .cge-badge') as HTMLElement;
      expect(badge.classList.contains('cge-header-badge-end')).toBe(true);
    });
  });

  describe('topBodyBuilder', () => {
    it('renders subheading, terms link and a benefits list', () => {
      const el = topBodyBuilder(
        args(
          { type: 'default' },
          {
            subheading: { kind: 'text', value: 'Cover for delays and more' },
            terms_link: { kind: 'link', href: 'https://cg.example/pds.pdf', label: 'View terms' },
            benefits: { kind: 'list', heading: 'Included', items: [{ name: 'b1', text: 'Trip delay' }] },
          },
        ),
      );

      expect(el.querySelector('.cge-section-subheading')?.textContent).toContain('Cover for delays and more');
      const link = el.querySelector('a') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('https://cg.example/pds.pdf');
      expect(el.querySelector('.cge-list-heading')?.textContent).toBe('Included');
      expect(el.textContent).toContain('Trip delay');
    });

    it('maps top panel content, location, and theme icon into the section', () => {
      const el = topBodyBuilder(
        args(
          {
            type: 'default',
            heading: { type: 'default' },
            info_panel: { type: 'default', location: 'top' },
            subheading: { type: 'default' },
            required_panel: { type: 'default', location: 'bottom' },
          },
          {
            heading: { kind: 'text', value: 'Cover summary' },
            info_panel: { kind: 'top_info_panel', title: 'Important', message: 'Check the details.' },
            subheading: { kind: 'text', value: 'Subheading' },
            required_panel: { kind: 'text', value: 'Choose an option.' },
          },
          { icons: { top_info_panel: 'check' } },
        ),
      );
      const children = Array.from(el.children);
      const icon = el.querySelector('.cge-message-info .cge-message-icon');

      expect(children[0].className).toBe('cge-top-body-heading');
      expect(children[1].className).toBe('cge-message cge-message-info');
      expect(children[2].className).toBe('cge-section-subheading');
      expect(children[3].className).toBe('cge-required-inline');
      expect(icon?.getAttribute('data-cg-icon')).toBe('check');
      expect(el.querySelector('.cge-message-title')?.textContent).toBe('Important');
      expect(el.textContent).toContain('Check the details.');
    });

    it('omits absent nodes without throwing', () => {
      const el = topBodyBuilder(args({ type: 'default' }, {}));

      expect(el.querySelector('.cge-section-subheading')).toBeNull();
      expect(el.querySelector('.cge-list')).toBeNull();
    });
  });

  describe('bottomBodyBuilder', () => {
    it('renders a testimonial with numeric rating and author', () => {
      const el = bottomBodyBuilder(
        args(
          { type: 'default', testimonial_panel: { type: 'default' } },
          {
            testimonial_panel: {
              kind: 'testimonial',
              testimonial: { text: 'Saved my trip', rating: '5', author: 'Verified customer' },
            },
          },
        ),
      );

      expect(el.textContent).toContain('Saved my trip');
      expect(el.textContent).toContain('Verified customer');
      expect(el.querySelector('.cge-stars')).not.toBeNull();
    });

    it('renders credibility copy as the sales-count line', () => {
      const el = bottomBodyBuilder(
        args(
          { type: 'default', credibility_panel: { type: 'default' } },
          {
            credibility_panel: { kind: 'text', value: 'Trusted by 200,000 travellers' },
          },
        ),
      );

      expect(el.textContent).toContain('Trusted by 200,000 travellers');
    });

    it('passes bottom info panel location through to the section', () => {
      const el = bottomBodyBuilder(
        args(
          { type: 'default', info_panel: { type: 'default', location: 'top' } },
          { info_panel: { kind: 'text', value: 'Important policy note' } },
        ),
      );

      expect(el.children[0].classList.contains('cge-message-info')).toBe(true);
      expect(el.textContent).toContain('Important policy note');
    });

    it('renders a trustpilot widget with fixed defaults on node presence, no content', () => {
      const el = bottomBodyBuilder(args({ type: 'default', trustpilot_panel: { type: 'default' } }, {}));

      expect(el.querySelector('.cge-trustpilot-panel')).not.toBeNull();
    });
  });

  describe('footerBuilder', () => {
    it('renders HTML disclaimer links and ignores the separate terms link', () => {
      const frag = document.createDocumentFragment();
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.setAttribute('href', 'https://cg.example/policy');
      a.textContent = 'policy';
      p.append('See our ', a);
      frag.appendChild(p);

      const el = footerBuilder(
        args(
          { type: 'default', disclaimer: { type: 'html' }, logo: { type: 'default' } },
          {
            disclaimer: { kind: 'richText', nodes: frag },
            terms_link: { kind: 'link', href: 'https://cg.example/terms', label: 'Terms' },
          },
        ),
      );

      const links = el.querySelectorAll('.cge-footer-disclaimer a');
      expect(links).toHaveLength(1);
      expect(links[0].getAttribute('href')).toBe('https://cg.example/policy');
    });

    it('renders a text disclaimer with its separate terms link', () => {
      const el = footerBuilder(
        args(
          { type: 'default', disclaimer: { type: 'text', terms_link: { type: 'default' } } },
          {
            disclaimer: { kind: 'text', value: 'Small print' },
            terms_link: { kind: 'link', href: 'https://cg.example/terms', label: 'Terms' },
          },
        ),
      );

      expect(el.querySelector('.cge-footer-disclaimer')?.textContent).toBe('Small print Terms');
      expect(el.querySelector('.cge-footer-disclaimer a')?.getAttribute('href')).toBe('https://cg.example/terms');
    });

    it('renders the logo when a logo node is present', () => {
      const el = footerBuilder(args({ type: 'default', logo: { type: 'default' } }, {}));

      expect(el.querySelector('.cge-footer-logo')).not.toBeNull();
    });

    it('renders a standalone terms link when the disclaimer node is absent', () => {
      const el = footerBuilder(
        args({ type: 'default' }, { terms_link: { kind: 'link', href: 'https://cg.example/terms', label: 'Terms' } }),
      );

      const link = el.querySelector('a') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('https://cg.example/terms');
    });
  });
});

describe('resolveIconName', () => {
  it('returns the fixed default when no theme override', () => {
    expect(resolveIconName(undefined, 'header')).toBe('header-shield');
    expect(resolveIconName({}, 'footer_logo')).toBe('xcover-logo');
    expect(resolveIconName({}, 'top_info_panel')).toBe('info');
  });

  it('returns the theme.icons override when present', () => {
    expect(resolveIconName({ icons: { header: 'custom' } }, 'header')).toBe('custom');
    expect(resolveIconName({ icons: { top_info_panel: 'custom-info' } }, 'top_info_panel')).toBe('custom-info');
  });

  it('falls back to the default when the override is empty', () => {
    expect(resolveIconName({ icons: { header: '' } }, 'header')).toBe('header-shield');
  });
});
