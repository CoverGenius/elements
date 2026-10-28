import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { COMPONENT_STYLES } from '../styles/generated/component-styles.generated';
import { coverGeniusDefaults } from '../theme/cover-genius-defaults';
import { internalThemeDefaults } from '../theme/wire-mapping';

const STYLES_DIR = resolve(__dirname, '../styles');

const RAW_REM = /[\d.]+rem\b/g;
const EM_UNIT = /[\d.]+em\b/g;
const FONT_SIZE_BASE = 'var(--cge-font-size-base)';

interface Rule {
  selector: string;
  declarations: { property: string; value: string }[];
}

function parseRules(css: string): Rule[] {
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/url\([^)]*\)/g, 'url()');

  return [...flat.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selector: selector.trim(),
    declarations: body
      .split(';')
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .map((declaration) => {
        const colon = declaration.indexOf(':');

        return { property: declaration.slice(0, colon).trim().toLowerCase(), value: declaration.slice(colon + 1) };
      }),
  }));
}

/**
 * Unit policy for component styles: lengths are px, text sizes anchor to
 * --cge-font-size-base, and em is only allowed where it is relative to the
 * element's own text (letter-spacing, or geometry in a rule that also sets
 * font-size). Returns one message per violation.
 */
function findUnitViolations(css: string): string[] {
  const violations: string[] = [];

  for (const match of css.matchAll(RAW_REM)) violations.push(`numeric rem (${match[0]})`);

  if (/@property/.test(css)) violations.push('@property (ignored inside shadow trees)');

  for (const { selector, declarations } of parseRules(css)) {
    const setsFontSize = declarations.some(({ property }) => property === 'font-size');

    for (const { property, value } of declarations) {
      if (value.includes('--cge-font-size-base') && property !== 'font-size') {
        violations.push(`${selector} { ${property} }: the font-size base is for font-size only`);
      }

      if (property === 'letter-spacing') continue;

      for (const match of value.matchAll(EM_UNIT)) {
        if (!setsFontSize)
          violations.push(`${selector} { ${property}: ${match[0]} }: em needs a font-size in the same rule`);
      }
    }
  }

  return violations;
}

describe('style unit policy (fitness function)', () => {
  const sources = readdirSync(STYLES_DIR)
    .filter((file) => file.endsWith('.css'))
    .map((file) => ({ file, css: readFileSync(join(STYLES_DIR, file), 'utf-8') }));

  it('finds the component style sources', () => {
    expect(sources.length).toBeGreaterThan(0);
  });

  it.each(sources.map(({ file, css }) => [file, css]))('%s follows the unit policy', (_file, css) => {
    expect(findUnitViolations(css)).toEqual([]);
  });

  it('the generated COMPONENT_STYLES follows the unit policy', () => {
    expect(findUnitViolations(COMPONENT_STYLES)).toEqual([]);
  });

  it('every text size in the generated styles is anchored, not a fixed or root-relative value', () => {
    const textSizes = parseRules(COMPONENT_STYLES)
      .flatMap(({ declarations }) => declarations)
      .filter(({ property }) => property === 'font-size')
      .map(({ value }) => value);

    expect(textSizes.length).toBeGreaterThan(0);

    for (const value of textSizes) expect(value).toMatch(/var\(--cge-|calc\(/);
  });

  it('no theme default resolves against the element it lands on (em units)', () => {
    const emValues = [
      ...Object.entries(internalThemeDefaults).map(([name, value]) => [name, value] as const),
      ...Object.entries(coverGeniusDefaults).map(([name, value]) => [name, value.light] as const),
    ].filter(([, value]) => value.search(EM_UNIT) !== -1);

    expect(emValues).toEqual([]);
  });

  describe('the checker itself', () => {
    it('flags numeric rem', () => {
      expect(findUnitViolations('.a { padding: 1rem; }')).toHaveLength(1);
    });

    it('flags @property', () => {
      expect(
        findUnitViolations("@property --x { syntax: '<length>'; inherits: true; initial-value: 1px; }"),
      ).toHaveLength(1);
    });

    it('flags the font-size base outside font-size', () => {
      expect(findUnitViolations('.a { gap: calc(1 * var(--cge-font-size-base)); }')).toHaveLength(1);
    });

    it('allows the font-size base inside font-size', () => {
      expect(findUnitViolations(`.a { font-size: calc(1 * ${FONT_SIZE_BASE}); }`)).toEqual([]);
    });

    it('flags geometry em when the rule sets no font-size', () => {
      expect(findUnitViolations('.a { gap: 0.5em; }')).toHaveLength(1);
    });

    it('allows geometry em when the rule sets its own font-size', () => {
      expect(findUnitViolations('.a { padding: 0.5em; font-size: 10px; }')).toEqual([]);
    });

    it('allows letter-spacing in em anywhere', () => {
      expect(findUnitViolations('.a { letter-spacing: 0.03em; }')).toEqual([]);
    });

    it('checks rules nested in an at-rule', () => {
      expect(findUnitViolations('@container (max-width: 480px) { .a { gap: 1em; } }')).toHaveLength(1);
    });

    it('does not read em inside a url() payload', () => {
      expect(
        findUnitViolations("@media (min-width: 1px) { .a { background: url('data:image/png;base64,9em+'); } }"),
      ).toEqual([]);
    });
  });
});
