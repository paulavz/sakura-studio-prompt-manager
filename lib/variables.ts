/**
 * Detects whether a string contains variable placeholders in the form {{variable_name}}.
 * Used by the gallery card indicator and (in future phases) the Drawer engine.
 */
export function hasVariables(text: string): boolean {
  return /\{\{[^{}]+\}\}/.test(text);
}

/**
 * Extracts unique variable names from a string.
 * Returns an array of unique names without the {{ }} wrappers.
 */
export function extractVariables(text: string): string[] {
  const matches = text.matchAll(/\{\{([^{}]+)\}\}/g);
  const names = Array.from(matches, (m) => m[1].trim());
  return Array.from(new Set(names));
}
