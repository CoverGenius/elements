import type { Logger } from '../shared/context';
import type { NodeBuilder, SectionBuilderMap } from './builder';

function key(nodeKind: string, type: string): string {
  return `${nodeKind}:${type}`;
}

const builders = new Map<string, NodeBuilder>();

export function registerBuilder(nodeKind: string, type: string, builder: NodeBuilder): void {
  builders.set(key(nodeKind, type), builder);
}

export function registerBuilders(manifest: SectionBuilderMap): void {
  for (const [nodeKind, builder] of Object.entries(manifest)) {
    registerBuilder(nodeKind, 'default', builder as NodeBuilder);
  }
}

/**
 * An unregistered `type` falls back to the kind's `default` builder;
 * a kind with no `default` resolves to `null`, and the node is skipped.
 */
export function resolveBuilder(nodeKind: string, type: string, logger?: Logger): NodeBuilder | null {
  const exact = builders.get(key(nodeKind, type));

  if (exact) return exact;

  const fallback = builders.get(key(nodeKind, 'default'));

  if (fallback) {
    logger?.debug('builder fallback to default', { nodeKind, type });
    return fallback;
  }

  logger?.debug('no builder for node kind', { nodeKind, type });

  return null;
}

export function clearBuilders(): void {
  builders.clear();
}
