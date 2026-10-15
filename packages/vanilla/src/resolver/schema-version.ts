/** The presentation schema versions this resolver renders. */
export const SUPPORTED_SCHEMA_VERSIONS: readonly string[] = ['1.0'] as const;

export function isSupportedSchemaVersion(version: unknown): version is string {
  return typeof version === 'string' && SUPPORTED_SCHEMA_VERSIONS.includes(version);
}
