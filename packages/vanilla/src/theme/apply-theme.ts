import { THEMABLE_VARIABLES } from './themable-variables';
import type { Logger } from '../shared/context';
import type { OverrideValue, Scheme, ThemeProfile } from '../shared/types';

const appliedByHost = new WeakMap<HTMLElement, Set<string>>();

const RELATIVE_UNIT = /[\d.]+(?:rem|em)\b|[\d.]+%/;

const PX_ONLY: ReadonlySet<string> = new Set(['fontSizeBase']);

const PX_LENGTH = /^\d*\.?\d+px$/i;

const rejectedByHost = new WeakMap<HTMLElement, Set<string>>();

function resolveValue(value: OverrideValue, scheme: Scheme): string | undefined {
  if (typeof value === 'string') return value;

  if (value && typeof value === 'object') return value[scheme] ?? value.light;

  return;
}

/**
 * Sets the resolved themable custom properties on `host`, from where they
 * inherit into the panel. `overrides` wins over `partner` per variable, and the
 * active `scheme` selects a value's light/dark form. Any property set on a prior
 * call and absent now is cleared, so a value dropped between renders never goes stale.
 * Does not throw: a failure leaves the panel on its baked defaults.
 */
export function applyTheme(theme: ThemeProfile | undefined, host: HTMLElement, scheme: Scheme, logger?: Logger): void {
  try {
    const previous = appliedByHost.get(host) ?? new Set<string>();

    const current = new Set<string>();

    for (const [wireName, cssVar] of Object.entries(THEMABLE_VARIABLES)) {
      const value = theme?.overrides?.[wireName] ?? theme?.partner?.[wireName];

      if (value === undefined || value === null) continue;

      const resolved = resolveValue(value, scheme);

      if (resolved === undefined) {
        logger?.debug('theme value skipped', { variable: wireName });

        continue;
      }

      if (PX_ONLY.has(wireName)) {
        if (!PX_LENGTH.test(String(resolved).trim())) {
          const rejected = rejectedByHost.get(host) ?? new Set<string>();
          const key = `${wireName}=${resolved}`;

          if (!rejected.has(key)) {
            logger?.warn(`theme value for ${wireName} (${resolved}) must be an absolute px length; ignored`);
            rejected.add(key);
            rejectedByHost.set(host, rejected);
          }

          continue;
        }
      } else if (RELATIVE_UNIT.test(resolved) && !previous.has(cssVar)) {
        logger?.warn(
          `theme value for ${wireName} (${resolved}) uses a root- or context-relative unit; it is not anchored to the panel, use px`,
        );
      }

      host.style.setProperty(cssVar, PX_ONLY.has(wireName) ? String(resolved).trim() : resolved);

      current.add(cssVar);
    }

    for (const cssVar of previous) {
      if (!current.has(cssVar)) host.style.removeProperty(cssVar);
    }

    appliedByHost.set(host, current);
  } catch (err) {
    logger?.debug('theme application failed', err);
  }
}
