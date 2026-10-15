import { describe, expect, it } from 'vitest';

import { inlineFile, lineOf, loadFanOutParents } from '../../scripts/inline-theme-defaults';

const FIXTURE_DEFAULTS = new Map<string, string>([
  ['--cge-badge-background-color', '#008800'],
  ['--cge-color-bg-card', '#f7f7f7'],
]);

describe('lineOf', () => {
  it('returns 1 for an offset on the first line', () => {
    expect(lineOf('abc\ndef', 1)).toBe(1);
  });

  it('returns the correct line for an offset past a newline', () => {
    expect(lineOf('abc\ndef\nghi', 5)).toBe(2);
  });
});

describe('inlineFile', () => {
  it('inlines the baked default for a themable variable', () => {
    const result = inlineFile('fixture.css', '.a { color: var(--cge-badge-background-color); }', FIXTURE_DEFAULTS);

    expect(result.errors).toEqual([]);
    expect(result.css).toBe('.a { color: var(--cge-badge-background-color, #008800); }');
  });

  it('inlines the baked default for a non-themable (coverGeniusDefaults) variable', () => {
    const result = inlineFile('fixture.css', '.a { background: var(--cge-color-bg-card); }', FIXTURE_DEFAULTS);

    expect(result.errors).toEqual([]);
    expect(result.css).toBe('.a { background: var(--cge-color-bg-card, #f7f7f7); }');
  });

  it('inlines multiple references in the same file', () => {
    const source = '.a { color: var(--cge-badge-background-color); } .b { background: var(--cge-color-bg-card); }';
    const result = inlineFile('fixture.css', source, FIXTURE_DEFAULTS);

    expect(result.errors).toEqual([]);
    expect(result.css).toBe(
      '.a { color: var(--cge-badge-background-color, #008800); } .b { background: var(--cge-color-bg-card, #f7f7f7); }',
    );
  });

  it('fails the build with a clear error for a --cge-* name in neither module', () => {
    const result = inlineFile('fixture.css', '.a { color: var(--cge-does-not-exist); }', FIXTURE_DEFAULTS);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('fixture.css:1');
    expect(result.errors[0]).toContain('--cge-does-not-exist');
    expect(result.errors[0]).toContain('is not defined in internalThemeDefaults or coverGeniusDefaults');
  });

  it('reports the correct line number for an error past the first line', () => {
    const source = '.a { color: red; }\n.b { color: var(--cge-missing); }';
    const result = inlineFile('fixture.css', source, FIXTURE_DEFAULTS);

    expect(result.errors[0]).toContain('fixture.css:2');
  });

  it('fails the build on a hand-written fallback', () => {
    const result = inlineFile(
      'fixture.css',
      '.a { color: var(--cge-badge-background-color, #ff0000); }',
      FIXTURE_DEFAULTS,
    );

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('fixture.css:1');
    expect(result.errors[0]).toContain('hand-written fallback');
    expect(result.errors[0]).toContain('--cge-badge-background-color');
  });

  it('allows currentColor as a hand-written fallback', () => {
    const result = inlineFile('fixture.css', '.a { color: var(--cge-icon-color, currentColor); }', FIXTURE_DEFAULTS);

    expect(result.errors).toEqual([]);
    expect(result.css).toBe('.a { color: var(--cge-icon-color, currentColor); }');
  });

  it('allows inherit, transparent, and unset as hand-written fallbacks', () => {
    for (const keyword of ['inherit', 'transparent', 'unset']) {
      const result = inlineFile('fixture.css', `.a { color: var(--cge-icon-color, ${keyword}); }`, FIXTURE_DEFAULTS);

      expect(result.errors, `expected ${keyword} to be allowed`).toEqual([]);
    }
  });

  it('rejects a hand-written fallback that merely resembles a keyword', () => {
    const result = inlineFile(
      'fixture.css',
      '.a { color: var(--cge-badge-background-color, inherited); }',
      FIXTURE_DEFAULTS,
    );

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('hand-written fallback');
  });

  it('leaves CSS untouched when it references no --cge-* variables', () => {
    const result = inlineFile('fixture.css', '.a { color: red; padding: 1px; }', FIXTURE_DEFAULTS);

    expect(result.errors).toEqual([]);
    expect(result.css).toBe('.a { color: red; padding: 1px; }');
  });

  it('collects every error in a file rather than stopping at the first', () => {
    const source = '.a { color: var(--cge-missing-one); } .b { color: var(--cge-missing-two); }';
    const result = inlineFile('fixture.css', source, FIXTURE_DEFAULTS);

    expect(result.errors).toHaveLength(2);
  });

  it('fails the build on a hand-written fallback containing a nested paren, without truncating mid-expression', () => {
    const result = inlineFile(
      'fixture.css',
      '.a { color: var(--cge-badge-background-color, rgba(0,0,0,.5)); }',
      FIXTURE_DEFAULTS,
    );

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('fixture.css:1');
    expect(result.errors[0]).toContain("hand-written fallback containing '('");
    expect(result.css).toBe('.a { color: var(--cge-badge-background-color, rgba(0,0,0,.5)); }');
  });
});

describe('unit anchoring', () => {
  const withDefault = (name: string, value: string) => new Map(FIXTURE_DEFAULTS).set(name, value);

  it('rejects numeric rem in source with file and line', () => {
    const result = inlineFile('fixture.css', '.a {\n  padding: 0.875rem;\n}', FIXTURE_DEFAULTS);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('fixture.css:2');
    expect(result.errors[0]).toContain('0.875rem');
  });

  it('rejects rem anywhere in source, including comments, strings, url() and at-rule preludes', () => {
    const source =
      "/* 2rem gap */ .a { content: '3rem'; background: url('x9rem=='); } @media (min-width: 30rem) { .b {} }";

    expect(inlineFile('fixture.css', source, FIXTURE_DEFAULTS).errors).toHaveLength(4);
  });

  it('rejects a scientific-notation rem instead of mangling it', () => {
    const result = inlineFile('fixture.css', '.a { letter-spacing: 1e-3rem; }', FIXTURE_DEFAULTS);

    expect(result.errors).toHaveLength(1);
  });

  it('anchors a font-size default to the font-size base', () => {
    const defaults = withDefault('--cge-size', '0.875rem');
    const result = inlineFile('fixture.css', '.a { font-size: var(--cge-size); }', defaults);

    expect(result.errors).toEqual([]);
    expect(result.css).toBe('.a { font-size: var(--cge-size, calc(0.875 * var(--cge-font-size-base))); }');
  });

  it('converts a geometry default to px at the 16px design root', () => {
    const defaults = withDefault('--cge-gap', '1.5rem');
    const result = inlineFile('fixture.css', '.a { gap: var(--cge-gap); }', defaults);

    expect(result.errors).toEqual([]);
    expect(result.css).toBe('.a { gap: var(--cge-gap, 24px); }');
  });

  it('converts every rem in a shorthand geometry default', () => {
    const defaults = withDefault('--cge-pad', '0.5rem 1rem');
    const result = inlineFile('fixture.css', '.a { padding: var(--cge-pad); }', defaults);

    expect(result.css).toBe('.a { padding: var(--cge-pad, 8px 16px); }');
  });

  it('keeps sub-pixel precision without float noise', () => {
    const defaults = withDefault('--cge-tracking', '0.0043750000186264515rem');
    const result = inlineFile('fixture.css', '.a { letter-spacing: var(--cge-tracking); }', defaults);

    expect(result.css).toBe('.a { letter-spacing: var(--cge-tracking, 0.07px); }');
  });

  it('leaves non-rem defaults untouched regardless of the consuming property', () => {
    const result = inlineFile('fixture.css', '.a { --x: var(--cge-badge-background-color); }', FIXTURE_DEFAULTS);

    expect(result.errors).toEqual([]);
    expect(result.css).toBe('.a { --x: var(--cge-badge-background-color, #008800); }');
  });

  it('reads the consuming property across comments in the same rule', () => {
    const defaults = withDefault('--cge-size', '1rem');
    const result = inlineFile(
      'fixture.css',
      '.a { /* note; with { braces } */ font-size: var(--cge-size); }',
      defaults,
    );

    expect(result.errors).toEqual([]);
    expect(result.css).toContain('calc(1 * var(--cge-font-size-base))');
  });

  it('fails on a rem default consumed through a custom property', () => {
    const defaults = withDefault('--cge-gap', '1rem');
    const result = inlineFile('fixture.css', '.a { --indirect: var(--cge-gap); }', defaults);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('--cge-gap');
  });

  it('fails on a rem default consumed by the font shorthand', () => {
    const defaults = withDefault('--cge-size', '1rem');
    const result = inlineFile('fixture.css', '.a { font: var(--cge-size) serif; }', defaults);

    expect(result.errors).toHaveLength(1);
  });

  it('fails when one variable is consumed as both text and geometry', () => {
    const defaults = withDefault('--cge-size', '1rem');
    const source = '.a { font-size: var(--cge-size); } .b { width: var(--cge-size); }';
    const result = inlineFile('fixture.css', source, defaults);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('both text and geometry');
  });

  it('tracks text and geometry consumption across files when given a shared map', () => {
    const defaults = withDefault('--cge-size', '1rem');
    const consumers = new Map();

    inlineFile('a.css', '.a { font-size: var(--cge-size); }', defaults, consumers);

    expect(inlineFile('b.css', '.b { width: var(--cge-size); }', defaults, consumers).errors).toHaveLength(1);
  });

  it('exempts the font-size base variable from the defaults lookup', () => {
    const result = inlineFile('fixture.css', '.a { font-size: var(--cge-font-size-base); }', FIXTURE_DEFAULTS);

    expect(result.errors).toEqual([]);
    expect(result.css).toBe('.a { font-size: var(--cge-font-size-base); }');
  });
});

describe('fan-out parents', () => {
  const defaults = new Map<string, string>([
    ['--cge-required-text-color', '#d62b00'],
    ['--cge-error-color', '#d62b00'],
  ]);

  it('nests the parent var between the child and its baked literal', () => {
    const parents = new Map([['--cge-required-text-color', '--cge-error-color']]);
    const result = inlineFile(
      'fixture.css',
      '.a { color: var(--cge-required-text-color); }',
      defaults,
      new Map(),
      parents,
    );

    expect(result.errors).toEqual([]);
    expect(result.css).toBe('.a { color: var(--cge-required-text-color, var(--cge-error-color, #d62b00)); }');
  });

  it('leaves a non fan-out variable as a flat fallback', () => {
    const parents = new Map([['--cge-required-text-color', '--cge-error-color']]);
    const result = inlineFile('fixture.css', '.a { color: var(--cge-error-color); }', defaults, new Map(), parents);

    expect(result.css).toBe('.a { color: var(--cge-error-color, #d62b00); }');
  });

  it('maps every SEMANTIC_FAN_OUT child to its parent css name', () => {
    const parents = loadFanOutParents();

    expect(parents.get('--cge-selection-accent-color')).toBe('--cge-accent-color');
    expect(parents.get('--cge-required-text-color')).toBe('--cge-error-color');
    expect(parents.get('--cge-required-border-color')).toBe('--cge-error-color');
  });
});
