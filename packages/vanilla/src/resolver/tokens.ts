const TOKEN_PATTERN = /\{([a-zA-Z0-9_]+)\}/g;

/**
 * Substitutes every `{token}` in `template` from `values`. A token with no
 * entry in `values` is stripped (not left as literal `{token}` text) and
 * reported via `onUnresolved`, per the degrade-never-throw rule.
 */
export function resolveTokens(
  template: string,
  values: Record<string, string>,
  onUnresolved: (token: string) => void,
): string {
  return template.replace(TOKEN_PATTERN, (match, token: string) => {
    if (Object.hasOwn(values, token)) return values[token];

    onUnresolved(token);

    return '';
  });
}
