import { describe, it } from "node:test";
import assert from "node:assert";
import { removeSkillFromContent, scanSkills } from "../skills";

describe("removeSkillFromContent", () => {
  it("removes the exact skill line", () => {
    const content = "Some prompt.\n\nUsa la skill My Skill para este desarrollo.\n\nMore text.";
    const result = removeSkillFromContent(content, "My Skill");
    assert.strictEqual(result, "Some prompt.\n\nMore text.");
  });

  it("does not remove if name does not match", () => {
    const content = "Some prompt.\n\nUsa la skill My Skill para este desarrollo.";
    const result = removeSkillFromContent(content, "Other Skill");
    assert.strictEqual(result, content);
  });

  it("handles names with regex special characters", () => {
    const content = "Prompt.\n\nUsa la skill Skill [v2.0] para este desarrollo.";
    const result = removeSkillFromContent(content, "Skill [v2.0]");
    assert.strictEqual(result, "Prompt.");
  });

  it("trims trailing whitespace after removal", () => {
    const content = "Prompt.\n\nUsa la skill Alpha para este desarrollo.";
    const result = removeSkillFromContent(content, "Alpha");
    assert.strictEqual(result, "Prompt.");
  });

  it("removes multiple occurrences", () => {
    const content = "Start.\n\nUsa la skill Dup para este desarrollo.\n\nUsa la skill Dup para este desarrollo.\nEnd.";
    const result = removeSkillFromContent(content, "Dup");
    assert.strictEqual(result, "Start.\nEnd.");
  });

  it("removes one skill but leaves another", () => {
    const content = "Start.\n\nUsa la skill Alpha para este desarrollo.\n\nUsa la skill Beta para este desarrollo.\nEnd.";
    const result = removeSkillFromContent(content, "Alpha");
    assert.strictEqual(result, "Start.\n\nUsa la skill Beta para este desarrollo.\nEnd.");
  });
});

describe("scanSkills", () => {
  it("returns deduplicated skill names in order", () => {
    const content = "Text.\n\nUsa la skill Alpha para este desarrollo.\n\nUsa la skill Beta para este desarrollo.\n\nUsa la skill Alpha para este desarrollo.";
    const result = scanSkills(content);
    assert.deepStrictEqual(result, ["Alpha", "Beta"]);
  });

  it("returns empty array when no skills", () => {
    assert.deepStrictEqual(scanSkills("Plain text."), []);
  });
});
