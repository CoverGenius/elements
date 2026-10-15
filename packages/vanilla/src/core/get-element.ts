import type { Client } from './client';
import { ensureContainer } from './container';
import { defaultKey, isRegistered } from './registry';

/**
 * Returns the instance client for a <cg-elements> placement: the default
 * placement with no argument, or the one marked data-presentation-ref="{ref}".
 * The same target always yields the same client. Reads SDK state only and never
 * queries the DOM, so a client returned before its element mounts binds when the
 * element upgrades rather than failing.
 */
export function getElement(ref?: string): Client | undefined {
  if (!isRegistered()) return;

  const key = ref ?? defaultKey();

  return ensureContainer(key).getClient();
}
