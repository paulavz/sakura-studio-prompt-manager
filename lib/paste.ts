import type { Node, Schema } from "@tiptap/pm/model";

export function plainTextToParagraphNodes(text: string, schema: Schema): Node[] {
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block) => {
    const lines = block.split("\n");
    const content: Node[] = [];
    lines.forEach((line, i) => {
      if (i > 0) content.push(schema.nodes.hardBreak.create());
      if (line.length > 0) content.push(schema.text(line));
    });
    return schema.nodes.paragraph.create(null, content);
  });
}
