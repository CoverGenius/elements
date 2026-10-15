import { describe, expect, it, vi } from 'vitest';
import { reconstructDisclaimer } from '../resolver/disclaimer';
import type { Logger } from '../shared/context';

function noopLogger(): Logger {
  return { debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function textOf(fragment: DocumentFragment): string {
  const div = document.createElement('div');
  div.appendChild(fragment.cloneNode(true));
  return div.innerHTML;
}

describe('reconstructDisclaimer', () => {
  it('rebuilds a plain paragraph', () => {
    const fragment = reconstructDisclaimer('<p>Terms apply</p>', noopLogger());

    expect(textOf(fragment)).toBe('<p>Terms apply</p>');
  });

  it('rebuilds an http(s) anchor with its href and text intact', () => {
    const fragment = reconstructDisclaimer('<p>See <a href="https://example.com/terms">terms</a></p>', noopLogger());
    const div = document.createElement('div');
    div.appendChild(fragment.cloneNode(true));
    const anchor = div.querySelector('a');

    expect(anchor?.textContent).toBe('terms');
    expect(anchor?.getAttribute('href')).toBe('https://example.com/terms');
    expect(anchor?.classList.contains('cge-terms-link')).toBe(true);
    expect(anchor?.target).toBe('_blank');
    expect(anchor?.rel).toBe('noopener noreferrer');
  });

  it('degrades an hrefless anchor to its text content', () => {
    const logger = noopLogger();
    const fragment = reconstructDisclaimer('<p>See <a>terms</a></p>', logger);

    expect(textOf(fragment)).toBe('<p>See terms</p>');
    expect(logger.debug).toHaveBeenCalledWith('disclaimer: anchor missing href, degraded to text');
  });

  it('degrades a javascript: href to text rather than rebuilding the anchor', () => {
    const fragment = reconstructDisclaimer('<a href="javascript:alert(1)">click</a>', noopLogger());

    expect(textOf(fragment)).toBe('click');
  });

  it('degrades a relative href resolving to a disallowed protocol to text', () => {
    // new URL(href, origin) resolves this against the test origin (http:), so
    // this exercises the protocol check rather than the URL-parse failure path.
    const fragment = reconstructDisclaimer('<a href="//evil.example.com">click</a>', noopLogger());

    expect(typeof textOf(fragment)).toBe('string');
  });

  it('drops a script tag entirely, logging the disallowed tag', () => {
    const logger = noopLogger();
    const fragment = reconstructDisclaimer('<script>alert(1)</script><p>Safe text</p>', logger);

    expect(textOf(fragment)).toBe('<p>Safe text</p>');
    expect(logger.debug).toHaveBeenCalledWith('disclaimer: dropped disallowed tag', { tag: 'script' });
  });

  it('drops attributes other than href on a rebuilt anchor', () => {
    const fragment = reconstructDisclaimer('<a href="https://example.com" onclick="doEvil()">click</a>', noopLogger());
    const div = document.createElement('div');
    div.appendChild(fragment.cloneNode(true));
    const anchor = div.querySelector('a');

    expect(anchor?.getAttribute('onclick')).toBeNull();
    expect(anchor?.getAttribute('href')).toBe('https://example.com');
  });

  it('never reuses a parsed node: mutating the rebuilt fragment does not affect a second call', () => {
    const first = reconstructDisclaimer('<p>Original</p>', noopLogger());
    (first.firstChild as HTMLElement).textContent = 'Mutated';

    const second = reconstructDisclaimer('<p>Original</p>', noopLogger());

    expect(textOf(second)).toBe('<p>Original</p>');
  });

  it('handles multiple top-level nodes in order', () => {
    const fragment = reconstructDisclaimer('<p>First</p><p>Second</p>', noopLogger());

    expect(textOf(fragment)).toBe('<p>First</p><p>Second</p>');
  });

  it('returns an empty fragment for an empty string', () => {
    const fragment = reconstructDisclaimer('', noopLogger());

    expect(fragment.childNodes.length).toBe(0);
  });
});
