import { describe, it } from "node:test";
import assert from "node:assert";
import { hasVariables, extractVariables, replaceVariables } from "../variables";

describe("hasVariables", () => {
  it("returns true when text contains {{var}}", () => {
    assert.strictEqual(hasVariables("Hello {{name}}"), true);
  });

  it("returns false when no variables", () => {
    assert.strictEqual(hasVariables("Hello world"), false);
  });

  it("returns false for invalid patterns", () => {
    assert.strictEqual(hasVariables("{{123}}"), false);
    assert.strictEqual(hasVariables("{{ }}"), false);
    assert.strictEqual(hasVariables("{{a-b}}"), false);
  });
});

describe("extractVariables", () => {
  it("deduplicates and preserves order", () => {
    const result = extractVariables("{{a}} {{b}} {{a}} {{c}}");
    assert.deepStrictEqual(result, ["a", "b", "c"]);
  });

  it("returns empty array when no variables", () => {
    assert.deepStrictEqual(extractVariables("Plain text."), []);
  });
});

describe("replaceVariables", () => {
  it("replaces keys present in values", () => {
    const result = replaceVariables("Hello {{name}}", { name: "World" });
    assert.strictEqual(result, "Hello World");
  });

  it("leaves unknown variables untouched", () => {
    const result = replaceVariables("Hello {{name}} {{unknown}}", { name: "World" });
    assert.strictEqual(result, "Hello World {{unknown}}");
  });
});
