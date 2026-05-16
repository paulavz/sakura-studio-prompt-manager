import { describe, it } from "node:test";
import assert from "node:assert";
import { Schema } from "@tiptap/pm/model";
import { plainTextToParagraphNodes } from "../paste";

// Minimal schema mirroring the parts of StarterKit we exercise.
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "inline*",
      toDOM: () => ["p", 0],
      parseDOM: [{ tag: "p" }],
    },
    text: { group: "inline" },
    hardBreak: {
      group: "inline",
      inline: true,
      selectable: false,
      toDOM: () => ["br"],
      parseDOM: [{ tag: "br" }],
    },
  },
});

function paragraphTextOf(node: ReturnType<typeof plainTextToParagraphNodes>[number]): string {
  let out = "";
  node.forEach((child) => {
    if (child.isText) out += child.text;
    else if (child.type.name === "hardBreak") out += "\n";
  });
  return out;
}

describe("plainTextToParagraphNodes", () => {
  it("Test 1 — multi-paragraph text produces multiple paragraph nodes", () => {
    const nodes = plainTextToParagraphNodes("Para 1.\n\nPara 2.\n\nPara 3.", schema);
    assert.strictEqual(nodes.length, 3);
    assert.ok(nodes.every((n) => n.type.name === "paragraph"));
    assert.strictEqual(paragraphTextOf(nodes[0]), "Para 1.");
    assert.strictEqual(paragraphTextOf(nodes[1]), "Para 2.");
    assert.strictEqual(paragraphTextOf(nodes[2]), "Para 3.");
  });

  it("Test 2 — single newline becomes a hard break inside one paragraph", () => {
    const nodes = plainTextToParagraphNodes("Linea 1\nLinea 2", schema);
    assert.strictEqual(nodes.length, 1);
    const p = nodes[0];
    assert.strictEqual(p.childCount, 3);
    assert.strictEqual(p.child(0).text, "Linea 1");
    assert.strictEqual(p.child(1).type.name, "hardBreak");
    assert.strictEqual(p.child(2).text, "Linea 2");
  });

  it("Test 3 — combines multiple paragraphs with soft breaks inside", () => {
    const nodes = plainTextToParagraphNodes("Title:\nDetail line\n\nNext para.", schema);
    assert.strictEqual(nodes.length, 2);
    assert.strictEqual(paragraphTextOf(nodes[0]), "Title:\nDetail line");
    assert.strictEqual(paragraphTextOf(nodes[1]), "Next para.");
  });

  it("Test 4 — 3+ consecutive newlines collapse to a paragraph break", () => {
    const nodes = plainTextToParagraphNodes("A\n\n\n\nB", schema);
    assert.strictEqual(nodes.length, 2);
    assert.strictEqual(paragraphTextOf(nodes[0]), "A");
    assert.strictEqual(paragraphTextOf(nodes[1]), "B");
  });

  it("Test 5 — text without newlines produces a single paragraph", () => {
    const nodes = plainTextToParagraphNodes("Just one line.", schema);
    assert.strictEqual(nodes.length, 1);
    assert.strictEqual(paragraphTextOf(nodes[0]), "Just one line.");
  });

  it("Test 6 — empty string produces a single empty paragraph", () => {
    const nodes = plainTextToParagraphNodes("", schema);
    assert.strictEqual(nodes.length, 1);
    assert.strictEqual(nodes[0].childCount, 0);
  });

  it("Test 7 — pasted reporte text survives serialization with paragraph count intact", () => {
    const pasted = `Eres un ingeniero senior documentando una sesión.

Tu tarea es producir un reporte estructurado.

Usa las siguientes entradas para redactar el reporte.`;
    const nodes = plainTextToParagraphNodes(pasted, schema);
    assert.strictEqual(nodes.length, 3, `Expected 3 paragraphs, got ${nodes.length}`);
  });
});
