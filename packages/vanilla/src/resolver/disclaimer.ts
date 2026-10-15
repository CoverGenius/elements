import type { Logger } from '../shared/context';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Parses `html` and rebuilds only `<p>` and `<a href>` (http/https) as fresh
 * nodes, dropping everything else (scripts, other tags, event attributes).
 * Never reuses a parsed node directly, so no attribute or listener from the
 * original markup can ride along into the rebuilt tree.
 */
export function reconstructDisclaimer(html: string, logger: Logger): DocumentFragment {
  const fragment = document.createDocumentFragment();

  const parsed = new DOMParser().parseFromString(html, 'text/html');

  for (const child of Array.from(parsed.body.childNodes)) {
    const rebuilt = rebuildNode(child, logger);

    if (rebuilt) fragment.appendChild(rebuilt);
  }

  return fragment;
}

function rebuildNode(node: Node, logger: Logger): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(node.textContent ?? '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    logger.debug('disclaimer: dropped non-element node', { nodeType: node.nodeType });

    return null;
  }

  const el = node as Element;

  const tag = el.tagName.toLowerCase();

  if (tag === 'p') {
    const p = document.createElement('p');

    for (const child of Array.from(el.childNodes)) {
      const rebuildChild = rebuildNode(child, logger);

      if (rebuildChild) p.appendChild(rebuildChild);
    }

    return p;
  }

  if (tag === 'a') {
    return rebuildAnchor(el, logger);
  }

  logger.debug('disclaimer: dropped disallowed tag', { tag });

  return null;
}

function rebuildAnchor(el: Element, logger: Logger): Node | null {
  const href = el.getAttribute('href');

  // An hrefless CMS link degrades to its text content rather than disappearing.
  if (!href) {
    logger.debug('disclaimer: anchor missing href, degraded to text');

    return document.createTextNode(el.textContent ?? '');
  }

  let url: URL;

  try {
    url = new URL(href, window.location.origin);
  } catch {
    logger.debug('disclaimer: anchor href unparsable, degraded to text', { href });

    return document.createTextNode(el.textContent ?? '');
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    logger.debug('disclaimer: anchor protocol disallowed, degraded to text', { href, protocol: url.protocol });

    return document.createTextNode(el.textContent ?? '');
  }

  const a = document.createElement('a');

  a.className = 'cge-terms-link';
  a.setAttribute('href', href);
  a.target = '_blank';
  a.rel = 'noopener noreferrer';

  a.textContent = el.textContent ?? '';

  return a;
}
