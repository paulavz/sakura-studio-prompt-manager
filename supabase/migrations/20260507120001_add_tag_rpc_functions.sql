-- ============================================================================
-- Migration: Phase 8 Batch 1+2 — Fix tags unique constraint + Add atomic RPCs
-- Apply via Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

-- ── 1. Fix tags.slug uniqueness for multi-user v2 ───────────────────────────
-- Drop global UNIQUE (handles renamed constraints too), add composite UNIQUE.

do $$
declare c text;
begin
  select conname into c
  from pg_constraint
  where conrelid = 'public.tags'::regclass
    and contype = 'u'
    and array_length(conkey, 1) = 1;  -- single-column unique

  if c is not null then
    execute format('alter table public.tags drop constraint %I', c);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tags_owner_slug_unique'
  ) then
    alter table public.tags
      add constraint tags_owner_slug_unique unique (owner, slug);
  end if;
end $$;

-- ── 2. Index for GIN queries on items.tags ──────────────────────────────────
-- Required for @> and ? operators used by the RPC functions below.

create index if not exists items_tags_gin_idx
  on public.items using gin (tags jsonb_path_ops);

-- ── 3. rename_tag ───────────────────────────────────────────────────────────
-- Atomically renames a tag and updates all item tag arrays for the owner.
-- Returns affected item IDs so the caller can revalidate paths.
-- NOTE: p_owner_id is explicit for v1 service-role context.
--       v2 migration will switch to auth.uid() and drop the parameter.

create or replace function public.rename_tag(
  p_tag_id uuid,
  p_new_slug text,
  p_owner_id uuid
)
returns table(affected_item_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_slug text;
  v_existing_id uuid;
begin
  -- Validate slug format up front to avoid wasted work
  if p_new_slug !~ '^[a-z][a-z0-9_]*$' then
    raise exception 'Invalid slug format';
  end if;

  -- Verify tag exists and belongs to owner
  select slug into v_old_slug
  from public.tags
  where id = p_tag_id and owner = p_owner_id;

  if not found then
    raise exception 'Tag not found';
  end if;

  if v_old_slug = p_new_slug then
    return;
  end if;

  -- Check duplicate slug under same owner
  select id into v_existing_id
  from public.tags
  where owner = p_owner_id and slug = p_new_slug and id != p_tag_id;

  if found then
    raise exception 'A tag with this name already exists';
  end if;

  -- Update tag slug first (logical order)
  update public.tags
  set slug = p_new_slug
  where id = p_tag_id and owner = p_owner_id;

  -- Update items: replace old slug with new slug, deduplicate
  update public.items
  set tags = (
    select coalesce(jsonb_agg(distinct elem order by elem), '[]'::jsonb)
    from (
      select case
        when value #>> '{}' = v_old_slug then p_new_slug
        else value #>> '{}'
      end as elem
      from jsonb_array_elements(tags)
    ) sub
  )
  where owner = p_owner_id
    and tags @> to_jsonb(array[v_old_slug]);

  -- Return affected item IDs for revalidation
  return query
  select i.id
  from public.items i
  where i.owner = p_owner_id
    and i.tags @> to_jsonb(array[p_new_slug]);
end;
$$;

-- ── 4. delete_tag_safe ──────────────────────────────────────────────────────
-- Deletes a tag only if it is unused by any item for the owner.
-- Single transaction, TOCTOU is attenuated but not eliminated without
-- a referential integrity trigger (C4, planned for Batch 5).

create or replace function public.delete_tag_safe(
  p_tag_id uuid,
  p_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug text;
  v_count int;
begin
  select slug into v_slug
  from public.tags
  where id = p_tag_id and owner = p_owner_id;

  if not found then
    raise exception 'Tag not found';
  end if;

  select count(*) into v_count
  from public.items
  where owner = p_owner_id
    and tags @> to_jsonb(array[v_slug]);

  if v_count > 0 then
    raise exception 'Cannot delete tag: used by % item(s)', v_count;
  end if;

  delete from public.tags
  where id = p_tag_id and owner = p_owner_id;
end;
$$;

-- ── 5. Grants ───────────────────────────────────────────────────────────────
-- v1: restricted to service_role only (admin client).
-- v2 migration will switch to auth.uid() and re-grant to authenticated.
-- Public and anon must not execute these functions.

grant execute on function public.rename_tag(uuid, text, uuid)
  to service_role;
grant execute on function public.delete_tag_safe(uuid, uuid)
  to service_role;

revoke execute on function public.rename_tag(uuid, text, uuid)
  from public, anon, authenticated;
revoke execute on function public.delete_tag_safe(uuid, uuid)
  from public, anon, authenticated;
