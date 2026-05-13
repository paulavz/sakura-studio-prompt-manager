/**
 * lib/skills.ts — Phase 6
 *
 * Source of truth: applied_skills jsonb column in items table (and its snapshot in versions).
 *
 * The prose line "Usa la skill NAME para este desarrollo." is injected
 * into content for LLM readability, but deduplication, detection, and the
 * "Applied Skills" panel all use the column/array directly — immune to
 * Tiptap/marked/turndown roundtrip.
 *
 * IMPORTANT: manual prose edits in raw mode do NOT sync with applied_skills.
 * If a user deletes the "Usa la skill X…" line by hand, the panel will still
 * show X as applied (the column is truth). Use the UI buttons (Add Skill) to
 * manage skills. A future version may add "un-apply" controls.
 *
 * Deduplication is by skill ID (UUID), not title.
 * Two skills with the same title but different IDs are treated as distinct.
 */

export const SKILL_INJECTION_TEMPLATE = (skillName: string) =>
  `\n\nUsa la skill ${skillName} para este desarrollo.`;

/**
 * Apply a skill to content and the appliedSkills array if not already present
 * (deduped by skill ID). Returns updated content + updated appliedSkills array,
 * or null if the skill is already applied.
 */
export function applySkill(
  content: string,
  appliedSkills: { id: string; name: string }[],
  skillId: string,
  skillName: string
): { content: string; appliedSkills: { id: string; name: string }[] } | null {
  if (appliedSkills.some((s) => s.id === skillId)) {
    return null;
  }
  return {
    content: content + SKILL_INJECTION_TEMPLATE(skillName),
    appliedSkills: [...appliedSkills, { id: skillId, name: skillName }],
  };
}

const SKILL_SCAN_RE = /Usa la skill (.+?) para este desarrollo\./g;

/**
 * Scan content for injected skill references.
 * Returns deduplicated skill names in order of first appearance.
 */
export function scanSkills(content: string): string[] {
  const names: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = SKILL_SCAN_RE.exec(content)) !== null) {
    const name = match[1].trim();
    if (!names.includes(name)) {
      names.push(name);
    }
  }
  return names;
}
