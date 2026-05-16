-- Sakura Prompt Studio — Add 5 top-level categories + drop subcategory column.
--
-- Decisions: PLAN-NEW-CATEGORIES.md (Q1, Q1.a, Q2, Q3 resolved).
--   - New categories: plan | report | output | messaging.
--   - 'agente' and 'skill' preserved as categories.
--   - subcategory column is dropped. Existing Planes migrated to category='plan'.
--   - Other non-null subcategories (Test / Debug / n8n) are backfilled into tags
--     (snake_case) before the column drop so the information is not lost.

begin;

-- 1. Drop existing CHECK constraint on items.category
do $$
declare con_name text;
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

-- 2. Re-add the constraint with the 7 allowed values
alter table public.items
  add constraint items_category_check
  check (category in (
    'template', 'plan', 'report', 'output', 'messaging',
    'agente', 'skill'
  ));

-- 3. Migrate Planes → category='plan'
update public.items
   set category = 'plan',
       subcategory = null
 where category = 'template'
   and subcategory = 'Planes';

-- 4. Insert missing tags for Test / Debug / n8n so the integrity trigger doesn't fail
insert into public.tags (slug, label, owner)
  select distinct lower(i.subcategory), initcap(i.subcategory), i.owner
  from public.items i
  where i.subcategory in ('Test', 'Debug', 'n8n')
    and i.subcategory is not null
    and not exists (
      select 1 from public.tags t where t.slug = lower(i.subcategory) and t.owner = i.owner
    );

-- 5. Preserve Test / Debug / n8n as tags before dropping the column.
--    Uses jsonb ? text (array membership) valid for jsonb arrays.
update public.items
   set tags = case
     when lower(subcategory) = 'test' and not (tags ? 'test')
       then tags || '["test"]'::jsonb
     when lower(subcategory) = 'debug' and not (tags ? 'debug')
       then tags || '["debug"]'::jsonb
     when lower(subcategory) = 'n8n' and not (tags ? 'n8n')
       then tags || '["n8n"]'::jsonb
     else tags
   end
 where subcategory in ('Test', 'Debug', 'n8n')
   and subcategory is not null;

-- 6. Drop the subcategory column entirely
alter table public.items drop column if exists subcategory;

commit;
