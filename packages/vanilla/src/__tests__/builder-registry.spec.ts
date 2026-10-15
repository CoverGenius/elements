import { describe, expect, it, afterEach, vi } from 'vitest';
import { resolveBuilder, registerBuilder, clearBuilders } from '../resolver/registry';
import type { BuildArgs } from '../resolver/builder';

const stub = (tag: string) => (_args: BuildArgs) => {
  const el = document.createElement('div');

  el.dataset.tag = tag;

  return el;
};

describe('builder registry', () => {
  afterEach(() => clearBuilders());

  it('resolves the exact (kind, type) builder', () => {
    const b = stub('exact');

    registerBuilder('opt_in', 'card', b);

    expect(resolveBuilder('opt_in', 'card')).toBe(b);
  });

  it('falls back to the kind default for an unknown type', () => {
    const def = stub('default');

    registerBuilder('opt_in', 'default', def);

    expect(resolveBuilder('opt_in', 'unknown-type')).toBe(def);
  });

  it('returns null when the kind has no default', () => {
    expect(resolveBuilder('never_registered', 'default')).toBeNull();
  });

  it('is last-write-wins for the same (kind, type)', () => {
    const first = stub('first');
    const second = stub('second');

    registerBuilder('header', 'default', first);
    registerBuilder('header', 'default', second);

    expect(resolveBuilder('header', 'default')).toBe(second);
  });

  it('debug-logs the default fallback with structured data', () => {
    const logger = { debug: vi.fn(), warn: vi.fn(), error: vi.fn() };

    registerBuilder('opt_in', 'default', stub('default'));
    resolveBuilder('opt_in', 'unknown', logger);

    expect(logger.debug).toHaveBeenCalledWith('builder fallback to default', {
      nodeKind: 'opt_in',
      type: 'unknown',
    });
  });

  it('debug-logs when no builder resolves', () => {
    const logger = { debug: vi.fn(), warn: vi.fn(), error: vi.fn() };

    resolveBuilder('missing', 'default', logger);

    expect(logger.debug).toHaveBeenCalledWith('no builder for node kind', {
      nodeKind: 'missing',
      type: 'default',
    });
  });
});
