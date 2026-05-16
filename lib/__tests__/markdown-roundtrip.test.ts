import { describe, it } from "node:test";
import assert from "node:assert";
import { markdownToHtml, htmlToMarkdown } from "../markdown";

function roundTrip(markdown: string): string {
  return htmlToMarkdown(markdownToHtml(markdown));
}

function countOccurrences(str: string, sub: string): number {
  return (str.match(new RegExp(sub, "g")) || []).length;
}

describe("markdown round-trip (linebreaks)", () => {
  it("Test 1 — multiple paragraphs survive round-trip", () => {
    const input = "Para 1.\n\nPara 2.\n\nPara 3.";
    const html = markdownToHtml(input);
    const pCount = countOccurrences(html, "<p");
    assert.strictEqual(pCount, 3, `Expected 3 <p> tags, got ${pCount}. HTML: ${html}`);
    const output = htmlToMarkdown(html);
    assert.ok(
      output.includes("Para 1.") && output.includes("Para 2.") && output.includes("Para 3."),
      `Round-trip lost paragraph content. Output: ${output}`
    );
    assert.ok(
      output.includes("\n\n"),
      `Round-trip collapsed paragraphs — no double newline found. Output: ${output}`
    );
  });

  it("Test 2 — soft breaks (<br> / Shift+Enter) survive round-trip", () => {
    const html = "<p>Linea 1<br>Linea 2</p>";
    const md = htmlToMarkdown(html);
    assert.ok(
      md.includes("  \n") || md.includes("\\\n"),
      `turndown did not emit a hard break. Markdown: ${JSON.stringify(md)}`
    );
    const rehtmled = markdownToHtml(md);
    assert.ok(
      rehtmled.includes("<br"),
      `Re-rendered HTML lost the <br>. HTML: ${rehtmled}`
    );
  });

  it("Test 3 — empty paragraphs preserve separation between content", () => {
    const html = "<p>A</p><p></p><p></p><p>B</p>";
    const md = htmlToMarkdown(html);
    const rehtmled = markdownToHtml(md);
    const pCount = countOccurrences(rehtmled, "<p");
    assert.ok(pCount >= 2, `Expected at least 2 <p> tags, got ${pCount}. HTML: ${rehtmled}`);
    assert.ok(
      !rehtmled.includes(">AB<") && !rehtmled.includes(">A B<"),
      `A and B got merged into the same element. HTML: ${rehtmled}`
    );
  });

  it("Test 4 — saved markdown renders with separate paragraphs", () => {
    const md = "Para 1.\n\nPara 2.";
    const html = markdownToHtml(md);
    const pCount = countOccurrences(html, "<p");
    assert.strictEqual(pCount, 2, `Expected 2 <p> tags, got ${pCount}. HTML: ${html}`);
  });

  it("Test 5 — hard break (two trailing spaces) renders as <br>", () => {
    const md = "Linea 1  \nLinea 2";
    const html = markdownToHtml(md);
    assert.ok(
      html.includes("<br"),
      `Expected <br> in rendered HTML. HTML: ${html}`
    );
  });

  it("Test 6 — round-trip is stable (idempotent on second pass)", () => {
    const input = "Para 1.\n\nPara 2.\n\nPara 3.";
    const first = roundTrip(input);
    const second = roundTrip(first);
    assert.strictEqual(
      second,
      first,
      `Round-trip is not stable. First: ${JSON.stringify(first)} Second: ${JSON.stringify(second)}`
    );
  });
});
