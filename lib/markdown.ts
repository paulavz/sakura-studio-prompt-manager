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
    return marked.parse(normalized, { async: false }) as string;
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