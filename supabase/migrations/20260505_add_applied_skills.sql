-- Add applied_skills jsonb column to items table.
-- Source of truth for skill detection, immune to Tiptap/marked/turndown roundtrip.
-- The prose line "Usa la skill X para este desarrollo." is still injected into
-- content for LLM readability, but detection and the panel read from this column.
alter table public.items
  add column applied_skills jsonb not null default '[]'::jsonb;
