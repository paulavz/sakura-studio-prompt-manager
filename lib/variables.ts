const VAR_PATTERN = /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g;

export function hasVariables(text: string): boolean {
  return new RegExp(VAR_PATTERN.source).test(text);
}

export function extractVariables(text: string): string[] {
  const matches = text.matchAll(new RegExp(VAR_PATTERN.source, "g"));
  const names = Array.from(matches, (m) => m[1].trim()).filter(Boolean);
  return Array.from(new Set(names));
}

export function replaceVariables(
  text: string,
  values: Record<string, string>
): string {
  return text.replace(new RegExp(VAR_PATTERN.source, "g"), (match, name) => {
    const key = name.trim();
    if (!key) return match;
    return key in values ? values[key] : match;
  });
}
