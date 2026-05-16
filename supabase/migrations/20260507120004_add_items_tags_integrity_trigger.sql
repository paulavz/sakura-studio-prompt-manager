-- ============================================================================
-- Migration: Phase 8 Batch 5 — Referential integrity trigger on items.tags
-- Validates that all elements in items.tags exist in public.tags for the same owner.
-- Prevents orphaned tag references at the DB level.
-- ============================================================================

-- ── validate_item_tags ──────────────────────────────────────────────────────
-- Trigger function: checks every slug in items.tags against public.tags.

create or replace function public.validate_item_tags()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Skip if tags is null or empty
  if new.tags is null or jsonb_array_length(new.tags) = 0 then
    return new;
  end if;

  -- Validate that every tag in the array exists for this owner
  if exists (
    select 1
    from jsonb_array_elements_text(new.tags) as slug
    where not exists (
      select 1 from public.tags
      where owner = new.owner and tags.slug = slug
    )
  ) then
    raise exception 'Invalid tag reference: one or more tags do not exist for this user';
  end if;

  return new;
end;
$$;

-- Attach trigger to items
drop trigger if exists items_validate_tags_trigger on public.items;
create trigger items_validate_tags_trigger
  before insert or update of tags on public.items
  for each row
  execute function public.validate_item_tags();

-- Grants: service_role and authenticated can execute the trigger function implicitly.
-- No explicit grant needed for trigger functions.
