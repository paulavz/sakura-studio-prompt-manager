import { describe, it } from "node:test";
import assert from "node:assert";
import { arraysEqualUnordered } from "../equality";

describe("arraysEqualUnordered (primitives)", () => {
  it("returns true for same elements in different order", () => {
    assert.strictEqual(arraysEqualUnordered(["a", "b"], ["b", "a"]), true);
  });

  it("returns false for different elements", () => {
    assert.strictEqual(arraysEqualUnordered(["a"], ["b"]), false);
  });

  it("returns false for different lengths", () => {
    assert.strictEqual(arraysEqualUnordered(["a"], ["a", "b"]), false);
  });

  it("treats arrays as sets (duplicates collapse)", () => {
    // Documented set-semantics — both reduce to {1, 2}
    assert.strictEqual(arraysEqualUnordered([1, 1, 2], [1, 2, 2]), true);
  });
});

describe("arraysEqualUnordered (with key)", () => {
  it("compares objects by extracted key", () => {
    const a = [{ id: "x" }, { id: "y" }];
    const b = [{ id: "y" }, { id: "x" }];
    assert.strictEqual(arraysEqualUnordered(a, b, (o) => o.id), true);
  });

  it("returns false when keys differ", () => {
    const a = [{ id: "x" }];
    const b = [{ id: "y" }];
    assert.strictEqual(arraysEqualUnordered(a, b, (o) => o.id), false);
  });
});
