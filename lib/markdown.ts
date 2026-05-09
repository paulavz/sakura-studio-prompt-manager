import { marked } from "marked";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

export function markdownToHtml(markdown: string): string {
  try {
    // Normalize headings missing a space after hashes (e.g. ##title -> ## title)
    const normalized = markdown.replace(
      /^(#{1,6})([^#\s])/gm,
      "$1 $2"
    );
    let html = marked.parse(normalized, { async: false }) as string;
    // Render {{variable}} syntax as styled chips for visual consistency
    html = html.replace(
      /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g,
      '<span data-testid="variable-chip" style="display:inline-flex;align-items:center;border-radius:0.25rem;padding:0.125rem 0.375rem;font-size:0.75rem;background-color:var(--color-sakura-20);border:1px solid var(--color-sakura-50);color:var(--color-variable-text);font-family:var(--font-mono);">{{$1}}</span>'
    );
    return html;
  } catch {
    return markdown;
  }
}

export function htmlToMarkdown(html: string): string {
  try {
    return turndown.turndown(html);
  } catch {
    return html;
  }
}
