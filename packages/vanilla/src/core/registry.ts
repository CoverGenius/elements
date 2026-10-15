import type { SdkContext } from '../shared/context';
import type { Container } from './container';

export const DEFAULT_TAG_NAME = 'cg-elements';

const contexts = new Map<string, SdkContext>();
const containers = new Map<string, Container>();

export function hasContext(tagName: string): boolean {
  return contexts.has(tagName);
}

export function setContext(tagName: string, context: SdkContext): void {
  contexts.set(tagName, context);
}

export function getContext(tagName: string): SdkContext | undefined {
  return contexts.get(tagName);
}

/** Test-only: resets the contexts map so specs don't leak state across each other. */
export function clearContexts(): void {
  contexts.clear();
}

export function isRegistered(): boolean {
  return contexts.has(DEFAULT_TAG_NAME);
}

export function defaultKey(): string {
  return DEFAULT_TAG_NAME;
}

export function getContainer(key: string): Container | undefined {
  return containers.get(key);
}

export function setContainer(key: string, container: Container): void {
  containers.set(key, container);
}

/** Removes the container for a key; client.unmount() is the only caller. */
export function deleteContainer(key: string): void {
  containers.delete(key);
}

/** Test-only: clears the container map */
export function clearContainers(): void {
  containers.clear();
}
