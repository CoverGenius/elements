import { describe, expect, it, vi } from 'vitest';
import { resolveTokens } from '../resolver/tokens';

describe('resolveTokens', () => {
  it('returns the template unchanged when it has no tokens', () => {
    expect(resolveTokens('Plain text', {}, vi.fn())).toBe('Plain text');
  });

  it('substitutes a single token from values', () => {
    expect(resolveTokens('Total: {amount}', { amount: '$10.00' }, vi.fn())).toBe('Total: $10.00');
  });

  it('substitutes every occurrence of a repeated token', () => {
    expect(resolveTokens('{amount} then {amount}', { amount: '$5' }, vi.fn())).toBe('$5 then $5');
  });

  it('substitutes multiple distinct tokens', () => {
    const result = resolveTokens('{a} and {b}', { a: '1', b: '2' }, vi.fn());

    expect(result).toBe('1 and 2');
  });

  it('strips a token with no matching entry in values', () => {
    expect(resolveTokens('Total: {missing}', {}, vi.fn())).toBe('Total: ');
  });

  it('reports an unresolved token via onUnresolved with the bare token name', () => {
    const onUnresolved = vi.fn();

    resolveTokens('Total: {missing}', {}, onUnresolved);

    expect(onUnresolved).toHaveBeenCalledWith('missing');
  });

  it('does not report a token that resolves successfully', () => {
    const onUnresolved = vi.fn();

    resolveTokens('Total: {amount}', { amount: '$10' }, onUnresolved);

    expect(onUnresolved).not.toHaveBeenCalled();
  });

  it('treats an empty-string value as resolved, not unresolved', () => {
    const onUnresolved = vi.fn();

    const result = resolveTokens('Value: [{amount}]', { amount: '' }, onUnresolved);

    expect(result).toBe('Value: []');
    expect(onUnresolved).not.toHaveBeenCalled();
  });

  it('leaves malformed placeholders (no closing brace) untouched', () => {
    expect(resolveTokens('Broken {token', {}, vi.fn())).toBe('Broken {token');
  });

  it('does not treat an empty {} as a token', () => {
    expect(resolveTokens('Empty {}', {}, vi.fn())).toBe('Empty {}');
  });

  it.each(['toString', 'constructor', '__proto__', 'hasOwnProperty', 'valueOf'])(
    'treats inherited Object member {%s} as unresolved, not a host-object leak',
    (token) => {
      const onUnresolved = vi.fn();

      expect(resolveTokens(`T: {${token}}`, {}, onUnresolved)).toBe('T: ');
      expect(onUnresolved).toHaveBeenCalledWith(token);
    },
  );
});
