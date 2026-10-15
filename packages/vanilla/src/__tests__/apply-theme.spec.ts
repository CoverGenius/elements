import { describe, expect, it, vi } from 'vitest';

import { applyTheme } from '../theme/apply-theme';
import { THEMABLE_VARIABLES } from '../theme/themable-variables';
import type { ThemeProfile } from '../shared/types';

function host() {
  return document.createElement('div');
}

function read(el: HTMLElement, cssVar: string): string {
  return el.style.getPropertyValue(cssVar);
}

describe('applyTheme: precedence', () => {
  it('sets a partner value on the mapped custom property', () => {
    const el = host();

    applyTheme({ partner: { accentColor: '#008800' } }, el, 'light');

    expect(read(el, THEMABLE_VARIABLES.accentColor)).toBe('#008800');
  });

  it('overrides win over partner for the same variable', () => {
    const el = host();

    applyTheme({ partner: { accentColor: '#008800' }, overrides: { accentColor: '#ff0000' } }, el, 'light');

    expect(read(el, THEMABLE_VARIABLES.accentColor)).toBe('#ff0000');
  });

  it('falls through to partner when overrides omits the variable', () => {
    const el = host();

    applyTheme({ partner: { accentColor: '#008800' }, overrides: { errorColor: '#ff0000' } }, el, 'light');

    expect(read(el, THEMABLE_VARIABLES.accentColor)).toBe('#008800');
    expect(read(el, THEMABLE_VARIABLES.errorColor)).toBe('#ff0000');
  });

  it('ignores keys outside the themable vocabulary', () => {
    const el = host();

    applyTheme({ partner: { notAThemableVariable: '#000000' } as ThemeProfile['partner'] }, el, 'light');

    expect(el.getAttribute('style')).toBeNull();
  });
});

describe('applyTheme: scheme selection', () => {
  const scheme = { optInBackgroundColor: { light: '#F2FAF8', dark: '#12291F' } };

  it('picks the light form under the light scheme', () => {
    const el = host();

    applyTheme({ partner: scheme }, el, 'light');

    expect(read(el, THEMABLE_VARIABLES.optInBackgroundColor)).toBe('#F2FAF8');
  });

  it('picks the dark form under the dark scheme', () => {
    const el = host();

    applyTheme({ partner: scheme }, el, 'dark');

    expect(read(el, THEMABLE_VARIABLES.optInBackgroundColor)).toBe('#12291F');
  });

  it('falls back to the light form when dark is absent', () => {
    const el = host();

    applyTheme({ partner: { optInBackgroundColor: { light: '#F2FAF8' } } }, el, 'dark');

    expect(read(el, THEMABLE_VARIABLES.optInBackgroundColor)).toBe('#F2FAF8');
  });
});

describe('applyTheme: clear-not-stale across re-render', () => {
  it('clears a variable dropped between calls rather than leaving it stale', () => {
    const el = host();

    applyTheme({ partner: { accentColor: '#008800' } }, el, 'light');
    expect(read(el, THEMABLE_VARIABLES.accentColor)).toBe('#008800');

    applyTheme({ partner: { errorColor: '#ff0000' } }, el, 'light');

    expect(read(el, THEMABLE_VARIABLES.accentColor)).toBe('');
    expect(read(el, THEMABLE_VARIABLES.errorColor)).toBe('#ff0000');
  });

  it('clears every applied variable when the theme is emptied', () => {
    const el = host();

    applyTheme({ partner: { accentColor: '#008800', errorColor: '#ff0000' } }, el, 'light');

    applyTheme({}, el, 'light');

    expect(read(el, THEMABLE_VARIABLES.accentColor)).toBe('');
    expect(read(el, THEMABLE_VARIABLES.errorColor)).toBe('');
  });

  it('clears every applied variable when theme is absent', () => {
    const el = host();

    applyTheme({ partner: { accentColor: '#008800' } }, el, 'light');

    applyTheme(undefined, el, 'light');

    expect(read(el, THEMABLE_VARIABLES.accentColor)).toBe('');
  });

  it('re-resolves values on a scheme switch without clearing the variable', () => {
    const el = host();
    const theme: ThemeProfile = { partner: { optInBackgroundColor: { light: '#F2FAF8', dark: '#12291F' } } };

    applyTheme(theme, el, 'light');
    expect(read(el, THEMABLE_VARIABLES.optInBackgroundColor)).toBe('#F2FAF8');

    applyTheme(theme, el, 'dark');

    expect(read(el, THEMABLE_VARIABLES.optInBackgroundColor)).toBe('#12291F');
  });

  it('tracks the applied set per host, not globally', () => {
    const a = host();
    const b = host();

    applyTheme({ partner: { accentColor: '#008800' } }, a, 'light');
    applyTheme({ partner: { errorColor: '#ff0000' } }, b, 'light');

    applyTheme({ partner: { errorColor: '#ff0000' } }, a, 'light');

    expect(read(a, THEMABLE_VARIABLES.accentColor)).toBe('');
    expect(read(b, THEMABLE_VARIABLES.errorColor)).toBe('#ff0000');
  });
});

describe('applyTheme: never throws', () => {
  it('does not throw and debug-logs when setProperty fails', () => {
    const el = host();
    const debug = vi.fn();

    vi.spyOn(el.style, 'setProperty').mockImplementation(() => {
      throw new Error('boom');
    });

    expect(() =>
      applyTheme({ partner: { accentColor: '#008800' } }, el, 'light', {
        debug,
        warn: () => {},
        error: () => {},
      }),
    ).not.toThrow();

    expect(debug).toHaveBeenCalled();
  });

  it('does not throw without a logger', () => {
    const el = host();

    vi.spyOn(el.style, 'setProperty').mockImplementation(() => {
      throw new Error('boom');
    });

    expect(() => applyTheme({ partner: { accentColor: '#008800' } }, el, 'light')).not.toThrow();
  });
});

describe('applyTheme: malformed values degrade per variable', () => {
  it('skips a null value and still applies later variables', () => {
    const el = host();

    applyTheme(
      { partner: { accentColor: null, errorColor: '#ff0000' } as unknown as ThemeProfile['partner'] },
      el,
      'light',
    );

    expect(read(el, THEMABLE_VARIABLES.accentColor)).toBe('');
    expect(read(el, THEMABLE_VARIABLES.errorColor)).toBe('#ff0000');
  });

  it('skips a non-string, non-object value and debug-logs it', () => {
    const el = host();
    const debug = vi.fn();

    applyTheme({ partner: { accentColor: 42 } as unknown as ThemeProfile['partner'] }, el, 'light', {
      debug,
      warn: () => {},
      error: () => {},
    });

    expect(read(el, THEMABLE_VARIABLES.accentColor)).toBe('');
    expect(debug).toHaveBeenCalled();
  });

  it('still runs the clear pass when a value is malformed', () => {
    const el = host();

    applyTheme({ partner: { accentColor: '#008800' } }, el, 'light');
    expect(read(el, THEMABLE_VARIABLES.accentColor)).toBe('#008800');

    applyTheme({ partner: { accentColor: null } as unknown as ThemeProfile['partner'] }, el, 'light');

    expect(read(el, THEMABLE_VARIABLES.accentColor)).toBe('');
  });
});

describe('applyTheme: relative-unit warning', () => {
  const logger = () => ({ debug: vi.fn(), warn: vi.fn(), error: vi.fn() });

  it.each(['1.5rem', '2em', '80%'])('warns once for the relative value %s and still applies it', (value) => {
    const el = host();
    const log = logger();

    applyTheme({ partner: { panelPadding: value } }, el, 'light', log);
    applyTheme({ partner: { panelPadding: value } }, el, 'light', log);

    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn.mock.calls[0][0]).toContain('panelPadding');
    expect(read(el, THEMABLE_VARIABLES.panelPadding)).toBe(value);
  });

  it('does not warn for absolute units or non-length values', () => {
    const el = host();
    const log = logger();

    applyTheme({ partner: { panelPadding: '24px', accentColor: '#008800' } }, el, 'light', log);

    expect(log.warn).not.toHaveBeenCalled();
  });

  it('warns again when the value is dropped and later reintroduced', () => {
    const el = host();
    const log = logger();

    applyTheme({ partner: { panelPadding: '1rem' } }, el, 'light', log);
    applyTheme(undefined, el, 'light', log);
    applyTheme({ partner: { panelPadding: '1rem' } }, el, 'light', log);

    expect(log.warn).toHaveBeenCalledTimes(2);
  });
});

describe('applyTheme: fontSizeBase is px only', () => {
  const logger = () => ({ debug: vi.fn(), warn: vi.fn(), error: vi.fn() });
  const cssVar = THEMABLE_VARIABLES.fontSizeBase;

  it.each([
    ['18px', '18px'],
    [' 18px ', '18px'],
    ['13.5px', '13.5px'],
  ])('applies %j as %s', (input, expected) => {
    const el = host();
    const log = logger();

    applyTheme({ partner: { fontSizeBase: input } }, el, 'light', log);

    expect(read(el, cssVar)).toBe(expected);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it.each(['1.25em', '2rem', '110%', 'large', 'calc(1px * 2)', '18', 'px'])(
    'rejects %j and keeps the baseline',
    (value) => {
      const el = host();
      const log = logger();

      applyTheme({ partner: { fontSizeBase: value } }, el, 'light', log);

      expect(read(el, cssVar)).toBe('');
      expect(log.warn).toHaveBeenCalledTimes(1);
      expect(log.warn.mock.calls[0][0]).toContain('fontSizeBase');
    },
  );

  it('warns once for a repeated rejected value', () => {
    const el = host();
    const log = logger();

    applyTheme({ partner: { fontSizeBase: '2rem' } }, el, 'light', log);
    applyTheme({ partner: { fontSizeBase: '2rem' } }, el, 'light', log);

    expect(log.warn).toHaveBeenCalledTimes(1);
  });

  it('clears a previously applied value when the next value is rejected', () => {
    const el = host();

    applyTheme({ partner: { fontSizeBase: '18px' } }, el, 'light');
    applyTheme({ partner: { fontSizeBase: '2rem' } }, el, 'light');

    expect(read(el, cssVar)).toBe('');
  });

  it('clears the value when the override is dropped', () => {
    const el = host();

    applyTheme({ partner: { fontSizeBase: '18px' } }, el, 'light');
    applyTheme(undefined, el, 'light');

    expect(read(el, cssVar)).toBe('');
  });

  it('resolves the light and dark object form', () => {
    const light = host();
    const dark = host();
    const value = { light: '16px', dark: '20px' };

    applyTheme({ partner: { fontSizeBase: value } }, light, 'light');
    applyTheme({ partner: { fontSizeBase: value } }, dark, 'dark');

    expect(read(light, cssVar)).toBe('16px');
    expect(read(dark, cssVar)).toBe('20px');
  });

  it('does not throw on a non-string value', () => {
    const el = host();

    expect(() => applyTheme({ partner: { fontSizeBase: 18 as unknown as string } }, el, 'light')).not.toThrow();
    expect(read(el, cssVar)).toBe('');
  });
});
