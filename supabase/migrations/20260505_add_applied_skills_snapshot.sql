-- Snapshot applied_skills in versions for correct restore.
-- When restoring a version, both content and applied_skills must be restored
-- together to avoid UI/data drift (panel shows skills not in prompt, or vice versa).

-- Make existing column idempotent (no-op if already added)
alter table public.items
  add column if not exists applied_skills jsonb not null default '[]'::jsonb;

-- Ensure applied_skills is an array (basic schema validation)
alter table public.items
  add constraint check_applied_skills_is_array
  check (jsonb_typeof(applied_skills) = 'array');

-- Version snapshot now captures the full item state
alter table public.versions
  add column if not exists applied_skills_snapshot jsonb not null default '[]'::jsonb;
