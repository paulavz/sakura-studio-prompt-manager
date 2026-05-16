/**
 * lib/agent.ts
 *
 * Agent assignment is stored as a prose line at the VERY START of content:
 *   Actúa como el agente «Name» para este desarrollo.
 *
 * Unlike applied_skills (which use a dedicated DB column), the agent lives
 * entirely in content. This is intentional: cardinality is singular and
 * keeping agent + content atomic simplifies versioning — no extra column,
 * no snapshot inconsistency.
 *
 * Detection anchors to the start of the string (no multiline flag). If the
 * user moves or deletes the line manually, the item is treated as unassigned.
 *
 * applyAgent removes ALL occurrences globally before prepending, which repairs
 * bad state (e.g., manually duplicated markers). Side-effect: if the body text
 * itself contains the marker format as legitimate prose, applyAgent will also
 * strip those occurrences. This is an accepted tradeoff given the specificity
 * of the pattern in real content.
 *
 * Separator choice — «» (U+00AB / U+00BB):
 *   - The DELIMITERS «» survive the markdown → Tiptap → Turndown round-trip
 *     unchanged, because they are not Markdown special characters.
 *   - The NAME between the delimiters is subject to Turndown's markdown
 *     normalization. Examples from a real run:
 *       «*Bold Agent*»           → «_Bold Agent_»   (emphasis conversion)
 *       «Agent_with_underscores» → «Agent\_with\_underscores» (escape added)
 *     For plain-text agent titles (the common case) the round-trip is lossless.
 *     Prefer titles without *, _, or other markdown emphasis characters.
 *   - Brackets [/] were explicitly rejected: Turndown escapes them to \[/\],
 *     which breaks detection after the first rendered-mode edit.
 *
 * applyAgent strips «» from the agent title to prevent them from breaking the
 * detection regex. This mutation is silent; titles containing «» will have
 * those chars removed from the stored marker.
 *
 * normalizeAgentTitle strips markdown emphasis chars (*, _, ~) and Turndown
 * escape backslashes from agent names so that comparisons between DB titles
 * and extracted names work reliably after Tiptap round-trips.
 */

/**
 * Normalize an agent name by stripping markdown emphasis characters and
 * Turndown escape backslashes. Used to compare DB titles against names
 * extracted from content after Tiptap round-trips.
 */
export function normalizeAgentTitle(name: string): string {
  return name.replace(/[*_~\\]/g, "").trim();
}

export function extractAgent(content: string): string | null {
  const re = /^Actúa como el agente «(.+?)» para este desarrollo\./;
  const match = re.exec(content);
  return match ? normalizeAgentTitle(match[1]) : null;
}

export function applyAgent(content: string, agentName: string): string {
  const safe = agentName.replace(/[«»]/g, "");
  const cleaned = content.replace(
    /Actúa como el agente «.+?» para este desarrollo\.\n*/g,
    ""
  ).trimStart();
  return `Actúa como el agente «${safe}» para este desarrollo.\n\n${cleaned}`;
}

export function removeAgent(content: string): string {
  return content.replace(
    /Actúa como el agente «.+?» para este desarrollo\.\n*/g,
    ""
  ).trimStart();
}
