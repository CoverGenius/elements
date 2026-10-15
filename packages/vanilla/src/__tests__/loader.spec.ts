import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const loaderCss = readFileSync(resolve(__dirname, '../styles/loader.css'), 'utf-8');

describe('loader.css', () => {
  it('targets cg-elements:not(:defined)', () => {
    expect(loaderCss).toContain('cg-elements:not(:defined)');
  });

  it('targets the loading state attribute', () => {
    expect(loaderCss).toContain("cg-elements[data-cg-elements-state='loading']");
  });

  it('sets a min-height to prevent layout shift', () => {
    expect(loaderCss).toMatch(/min-height:\s*\d+/);
  });

  it('embeds the CG loader SVG as a base64 data URI background', () => {
    expect(loaderCss).toContain('data:image/svg+xml;base64,');
    expect(loaderCss).toContain('background:');
  });

  it('does not reference any --cge-* theme variables', () => {
    expect(loaderCss).not.toMatch(/var\(--cge-/);
  });

  it('does not require JS injection (no .cge-loader class)', () => {
    expect(loaderCss).not.toContain('.cge-loader');
  });
});
