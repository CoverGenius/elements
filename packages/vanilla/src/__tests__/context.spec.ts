import { describe, expect, it, vi, afterEach } from 'vitest';
import { resolveContext } from '../shared/context';

describe('resolveContext', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults environment to "production" when omitted', () => {
    const context = resolveContext({} as never);

    expect(context.environment).toBe('production');
  });

  it('freezes the returned context', () => {
    const context = resolveContext({ environment: 'sandbox' });

    expect(Object.isFrozen(context)).toBe(true);

    expect(() => {
      'use strict';
      // @ts-expect-error assigning to a readonly/frozen property to assert the mutation is rejected
      context.environment = 'staging';
    }).toThrow();
    expect(context.environment).toBe('sandbox');
  });

  it('does not log to console when debug is omitted', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const context = resolveContext({ environment: 'production' });
    context.logger.debug('hello');
    context.logger.warn('hello');
    context.logger.error('hello');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('does not log to console when debug is false', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const context = resolveContext({ environment: 'production', debug: false });
    context.logger.debug('hello');
    context.logger.warn('hello');
    context.logger.error('hello');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('logs to console when debug is true, prefixed', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const context = resolveContext({ environment: 'production', debug: true });
    context.logger.debug('debug message');
    context.logger.warn('warn message');
    context.logger.error('error message');

    expect(debugSpy).toHaveBeenCalledWith('[cg-elements]', 'debug message');
    expect(warnSpy).toHaveBeenCalledWith('[cg-elements]', 'warn message');
    expect(errorSpy).toHaveBeenCalledWith('[cg-elements]', 'error message');
  });

  it('exposes only the resolved SDK settings', () => {
    const context = resolveContext({ environment: 'production' });

    expect(Object.keys(context).sort()).toEqual(['currency', 'debug', 'endpoints', 'environment', 'logger', 'scheme']);
  });

  it.each(['staging', 'sandbox', 'production'] as const)('resolves endpoints for %s environment', (environment) => {
    const context = resolveContext({ environment });

    expect(context.endpoints).toHaveProperty('telemetry');
    expect(context.endpoints).toHaveProperty('assetBase');
  });

  it('gives each context its own endpoints object, not a shared reference', () => {
    const a = resolveContext({ environment: 'production' });
    const b = resolveContext({ environment: 'production' });

    // Same values, but distinct objects: mutating one must not affect the other
    // or the shared module table (Object.freeze is shallow).
    expect(a.endpoints).not.toBe(b.endpoints);
    // @ts-expect-error mutating a readonly field on purpose to assert distinct objects
    a.endpoints.telemetry = 'mutated';
    expect(b.endpoints.telemetry).not.toBe('mutated');
  });

  it('formats currency by delegating to formatCurrency', () => {
    const context = resolveContext({ environment: 'production' });

    expect(context.currency.format(1000, 'USD')).toContain('$');
  });
});
