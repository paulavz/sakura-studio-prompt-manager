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

    // Extract code blocks before chip rendering so {{var}} inside code stays literal.
    // Indexed placeholders are used instead of a single sentinel to safely handle
    // content that has multiple code blocks or (theoretically) NUL bytes.
    const codeBlocks: string[] = [];
    html = html.replace(
      /<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>/g,
      (match) => {
        const i = codeBlocks.length;
        codeBlocks.push(match);
        return `__SAKURA_CODE_BLOCK_${i}__`;
      }
    );

    // Render {{variable}} syntax as styled chips for visual consistency
    html = html.replace(
      /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g,
      '<span class="variable-chip" data-testid="variable-chip">{{$1}}</span>'
    );

    // Restore code blocks in order
    codeBlocks.forEach((block, i) => {
      html = html.replace(`__SAKURA_CODE_BLOCK_${i}__`, block);
    });

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
