import { describe, it } from "node:test";
import assert from "node:assert";
import { extractAgent, applyAgent, removeAgent, normalizeAgentTitle } from "../agent";

describe("extractAgent", () => {
  it("returns agent name when present at start", () => {
    const result = extractAgent("Actúa como el agente «Test Agent» para este desarrollo.\n\nContent.");
    assert.strictEqual(result, "Test Agent");
  });

  it("returns null when no agent line", () => {
    assert.strictEqual(extractAgent("Plain content."), null);
  });

  it("returns null when agent line is not at start", () => {
    assert.strictEqual(extractAgent("Content.\nActúa como el agente «X» para este desarrollo."), null);
  });
});

describe("applyAgent", () => {
  it("prepends agent line to content", () => {
    const result = applyAgent("Content.", "Agent X");
    assert.ok(result.startsWith("Actúa como el agente «Agent X» para este desarrollo."));
    assert.ok(result.includes("Content."));
  });

  it("replaces existing agent", () => {
    const result = applyAgent("Actúa como el agente «Old» para este desarrollo.\n\nContent.", "New");
    assert.ok(result.startsWith("Actúa como el agente «New» para este desarrollo."));
    assert.ok(!result.includes("Old"));
  });
});

describe("removeAgent", () => {
  it("removes agent line and keeps content", () => {
    const result = removeAgent("Actúa como el agente «X» para este desarrollo.\n\nContent.");
    assert.strictEqual(result, "Content.");
  });

  it("leaves content without agent unchanged", () => {
    assert.strictEqual(removeAgent("Content."), "Content.");
  });
});

describe("normalizeAgentTitle", () => {
  it("strips markdown emphasis and escapes", () => {
    assert.strictEqual(normalizeAgentTitle("Agent_"), "Agent");
    assert.strictEqual(normalizeAgentTitle("Agent*"), "Agent");
  });
});

describe("round-trip", () => {
  it("preserves agent name through apply → extract", () => {
    const name = "Code Reviewer";
    const content = applyAgent("Some task.", name);
    assert.strictEqual(extractAgent(content), name);
  });
});
