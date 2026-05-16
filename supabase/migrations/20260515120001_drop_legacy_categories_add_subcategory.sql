-- Sakura Prompt Studio — Drop legacy categories + add subcategory column
--
-- Decisions: PLAN-DESIGN-DELTA-V2.md Q1 + Q3 (resolved 2026-05-15).
-- Q3: items.category check constraint narrows to ('template','agente','skill').
--     Legacy values 'plan' and 'data_output' are removed without backfill
--     because the DB was wiped (TRUNCATE) immediately before this migration.
-- Q1: items.subcategory text column added. Nullable, no CHECK (open list).
--     Values expected for category='template': Planes | Test | Debug | n8n.

begin;

-- Drop the existing CHECK constraint, whatever its generated name is
do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.items'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%category%';

  if con_name is not null then
    execute format('alter table public.items drop constraint %I', con_name);
  end if;
end $$;

alter table public.items
  add constraint items_category_check
  check (category in ('template', 'agente', 'skill'));

alter table public.items
  add column if not exists subcategory text;

comment on column public.items.subcategory is
  'Optional sub-grouping inside category. For category=template: Planes | Test | Debug | n8n. Null otherwise. No CHECK constraint (open list).';

commit;
