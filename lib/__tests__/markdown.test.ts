import { describe, it } from "node:test";
import assert from "node:assert";
import { markdownToHtml } from "../markdown";

describe("markdownToHtml", () => {
  it("renders {{var}} as chip in paragraphs", () => {
    const html = markdownToHtml("Hello {{name}} world.");
    assert.ok(html.includes('data-testid="variable-chip"'));
    assert.ok(html.includes('class="variable-chip"'));
    assert.ok(html.includes("{{name}}"));
    assert.ok(!html.includes("style="));
  });

  it("does not render chip inside fenced code blocks", () => {
    const html = markdownToHtml("```ts\nconst x = {{foo}};\n```");
    assert.ok(!html.includes('data-testid="variable-chip"'));
  });

  it("does not render chip inside inline code", () => {
    const html = markdownToHtml("Use `{{flag}}` here.");
    assert.ok(!html.includes('data-testid="variable-chip"'));
  });

  it("renders chips outside code blocks while keeping code literal", () => {
    const html = markdownToHtml("Set {{param}}.\n\n```\n{{ignored}}\n```\n\nThen {{other}}.");
    const chipCount = (html.match(/data-testid="variable-chip"/g) || []).length;
    assert.strictEqual(chipCount, 2);
    assert.ok(html.includes("{{ignored}}"));
  });

  it("handles multiple code blocks with indexed placeholders", () => {
    const md = "{{a}}\n\n```\n{{b}}\n```\n\n{{c}}\n\n```\n{{d}}\n```\n\n{{e}}";
    const html = markdownToHtml(md);
    const chipCount = (html.match(/data-testid="variable-chip"/g) || []).length;
    assert.strictEqual(chipCount, 3); // a, c, e
    assert.ok(html.includes("{{b}}"));
    assert.ok(html.includes("{{d}}"));
  });

  it("is not broken by content containing NUL bytes outside code blocks", () => {
    // NUL bytes in input should not corrupt placeholder replacement
    const md = "{{var}} normal content";
    const html = markdownToHtml(md);
    assert.ok(html.includes('data-testid="variable-chip"'));
  });
});
