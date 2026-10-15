import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { coverGeniusDefaults } from '../src/theme/cover-genius-defaults';
import { SEMANTIC_FAN_OUT, THEMABLE_VARIABLES } from '../src/theme/themable-variables';

import type { ThemableVariable } from '../src/theme/themable-variables';

const __dirname = dirname(fileURLToPath(import.meta.url));

const STYLES_DIR = resolve(__dirname, '../src/styles');
const OUTPUT_PATH = resolve(__dirname, '../src/styles/generated/component-styles.generated.ts');

// Matches `var(--cge-x)` (inlines the baked default) and `var(--cge-x, <literal>)`
// (a hand-written fallback, which the guard below rejects unless it is one of
// KEYWORD_FALLBACKS: a CSS keyword no token module could ever produce).
// The fallback segment excludes '(' as well as ')': a legitimate fallback is
// always one of the flat KEYWORD_FALLBACKS, never a nested call like rgba(...),
// so a fallback containing '(' cannot match here and instead falls through to
// the "unresolvable/malformed reference" error below, rather than a regex that
// stops at the fallback's own first ')' and truncates mid-expression.
const VAR_PATTERN = /var\((--cge-[a-z0-9-]+)(\s*,[^()]*)?\)/g;

// Not colors or sizes any --cge-* module can define; the only legitimate
// hand-written fallback, since it means "inherit," not "here is a literal."
const KEYWORD_FALLBACKS: ReadonlySet<string> = new Set(['currentColor', 'inherit', 'transparent', 'unset']);

interface InlineResult {
  css: string;
  errors: string[];
}

function lineOf(source: string, offset: number): number {
  return source.slice(0, offset).split('\n').length;
}

async function loadDefaults(): Promise<ReadonlyMap<string, string>> {
  // theme/wire-mapping.ts builds internalThemeDefaults eagerly at import time and can
  // throw (an unresolved fan-out or sdk-originated entry); surface that as a guard
  // failure, not a raw stack trace out of this script.
  let internalThemeDefaults: Record<ThemableVariable, string>;

  try {
    ({ internalThemeDefaults } = await import('../src/theme/wire-mapping'));
  } catch (error) {
    throw new Error(`inline-theme-defaults: failed to load internalThemeDefaults: ${(error as Error).message}`);
  }

  const defaults = new Map<string, string>();

  for (const [name, value] of Object.entries(coverGeniusDefaults)) defaults.set(name, value.light);

  // internalThemeDefaults is keyed by the camelCase wire name (e.g. badgeBackgroundColor);
  // THEMABLE_VARIABLES is the wire-name -> --cge-* map, a disjoint key space from the
  // coverGeniusDefaults source keys already in `defaults`, so this only adds entries.
  for (const [wireName, cgeVar] of Object.entries(THEMABLE_VARIABLES)) {
    defaults.set(cgeVar, internalThemeDefaults[wireName as ThemableVariable]);
  }

  return defaults;
}

// child --cge-* name -> parent --cge-* name, so a fan-out child resolves through its parent at
// runtime (`var(child, var(parent, literal))`) instead of freezing the parent's default.
function loadFanOutParents(): ReadonlyMap<string, string> {
  const parents = new Map<string, string>();

  for (const [child, parent] of Object.entries(SEMANTIC_FAN_OUT)) {
    parents.set(
      THEMABLE_VARIABLES[child as keyof typeof SEMANTIC_FAN_OUT],
      THEMABLE_VARIABLES[parent as keyof typeof THEMABLE_VARIABLES],
    );
  }

  return parents;
}

// A --cge-* var() whose fallback contains '(' (e.g. rgba(...)): VAR_PATTERN
// never matches these (its fallback segment excludes '('), so they need their
// own detection and error rather than silently passing through unflagged.
const NESTED_PAREN_FALLBACK = /var\(--cge-[a-z0-9-]+\s*,[^)]*\([^()]*\)/g;

// The font-size anchor is set on :host by the element baseline, not by a
// defaults module, so a hand-written var(--cge-font-size-base) resolves there.
const FONT_SIZE_ANCHOR = '--cge-font-size-base';

const PX_PER_REM = 16;

// Numeric rem is banned in hand-written CSS. The lookbehind refuses mid-token
// numbers (e.g. 1e-3rem) so STRAY_REM reports them instead of the converter
// mangling them.
const REM_VALUE = /(?<![\w.-])(-?\d*\.?\d+)rem\b/g;
const STRAY_REM = /[\d.]+rem\b/g;
const HAS_REM = /[\d.]+rem\b/;

type Consumer = 'text' | 'geometry';

// Blanks comments to spaces so offsets stay valid for the declaration lookback.
function blankComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => ' '.repeat(comment.length));
}

// The CSS property of the declaration containing `offset`, read back to the
// nearest `;`, `{` or `}`. undefined when it cannot be read unambiguously.
function consumingProperty(blanked: string, offset: number): string | undefined {
  const before = blanked.slice(0, offset);
  const start = Math.max(before.lastIndexOf(';'), before.lastIndexOf('{'), before.lastIndexOf('}')) + 1;

  return /^\s*([a-zA-Z-]+)\s*:/.exec(before.slice(start))?.[1]?.toLowerCase();
}

// Text sizes anchor to the font-size base; every other length becomes an
// absolute px value at the design system's 16px root.
function anchorLiteral(literal: string, consumer: Consumer): string {
  return literal.replace(REM_VALUE, (_, n: string) =>
    consumer === 'text' ? `calc(${n} * var(${FONT_SIZE_ANCHOR}))` : `${+(Number(n) * PX_PER_REM).toFixed(4)}px`,
  );
}

function inlineFile(
  filename: string,
  css: string,
  defaults: ReadonlyMap<string, string>,
  consumers: Map<string, Consumer> = new Map(),
  parents: ReadonlyMap<string, string> = new Map(),
): InlineResult {
  const errors: string[] = [];

  const blanked = blankComments(css);

  for (const match of css.matchAll(NESTED_PAREN_FALLBACK)) {
    errors.push(
      `${filename}:${lineOf(css, match.index)}: hand-written fallback containing '(' (${match[0]}...); remove it, only currentColor/inherit/transparent/unset are allowed as hand-written fallbacks`,
    );
  }

  for (const match of css.matchAll(STRAY_REM)) {
    errors.push(
      `${filename}:${lineOf(css, match.index)}: numeric rem (${match[0]}) is not allowed; use px for lengths and calc(N * var(${FONT_SIZE_ANCHOR})) for font-size`,
    );
  }

  const inlined = css.replace(VAR_PATTERN, (match, cgeVar: string, handWritten: string | undefined, offset: number) => {
    if (handWritten !== undefined) {
      const keyword = handWritten.replace(/^\s*,\s*/, '').trim();

      if (KEYWORD_FALLBACKS.has(keyword)) return match;

      errors.push(
        `${filename}:${lineOf(css, offset)}: hand-written fallback for ${cgeVar} (${match}); remove it, the build inlines the baked default`,
      );

      return match;
    }

    if (cgeVar === FONT_SIZE_ANCHOR) return match;

    const literal = defaults.get(cgeVar);

    if (literal === undefined) {
      errors.push(
        `${filename}:${lineOf(css, offset)}: ${cgeVar} is not defined in internalThemeDefaults or coverGeniusDefaults`,
      );

      return match;
    }

    if (!HAS_REM.test(literal)) {
      const parent = parents.get(cgeVar);

      return parent ? `var(${cgeVar}, var(${parent}, ${literal}))` : `var(${cgeVar}, ${literal})`;
    }

    const property = consumingProperty(blanked, offset);

    if (property === undefined || property.startsWith('--') || property === 'font') {
      errors.push(
        `${filename}:${lineOf(css, offset)}: cannot anchor the rem default of ${cgeVar}, its consuming property is not a plain declaration; use a longhand property`,
      );

      return match;
    }

    const consumer: Consumer = property === 'font-size' ? 'text' : 'geometry';
    const seen = consumers.get(cgeVar);

    if (seen !== undefined && seen !== consumer) {
      errors.push(
        `${filename}:${lineOf(css, offset)}: ${cgeVar} is consumed as both text and geometry; give each its own variable`,
      );

      return match;
    }

    const anchored = anchorLiteral(literal, consumer);

    if (HAS_REM.test(anchored)) {
      errors.push(
        `${filename}:${lineOf(css, offset)}: the default of ${cgeVar} (${literal}) contains a rem value that could not be converted`,
      );

      return match;
    }

    consumers.set(cgeVar, consumer);

    return `var(${cgeVar}, ${anchored})`;
  });

  return { css: inlined, errors };
}

async function run(): Promise<void> {
  const files = readdirSync(STYLES_DIR)
    .filter((entry) => entry.endsWith('.css'))
    .sort(); // deterministic concat order

  if (files.length === 0) {
    throw new Error(`inline-theme-defaults: no .css files found under ${STYLES_DIR}`);
  }

  const defaults = await loadDefaults();

  const errors: string[] = [];
  const parts: string[] = [];
  const consumers = new Map<string, Consumer>();
  const parents = loadFanOutParents();

  for (const file of files) {
    const source = readFileSync(join(STYLES_DIR, file), 'utf-8');
    const result = inlineFile(file, source, defaults, consumers, parents);

    errors.push(...result.errors);
    parts.push(`/* ${file} */\n${result.css}`);
  }

  if (errors.length > 0) {
    throw new Error(['inline-theme-defaults: build-time guard failed:', ...errors.map((e) => `  - ${e}`)].join('\n'));
  }

  const output = [
    '// Generated by scripts/inline-theme-defaults.ts. Do not edit by hand.',
    'export const COMPONENT_STYLES = `',
    parts.join('\n\n'),
    '`;',
    '',
  ].join('\n');

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, output);
}

export { inlineFile, loadDefaults, loadFanOutParents, lineOf, run };
