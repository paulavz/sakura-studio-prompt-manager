-- ============================================================================
-- Migration: Phase 8 Batch 3 — get_tags_with_usage RPC
-- Replaces JS O(items × tags) loop with single Postgres query.
-- ============================================================================

-- ── get_tags_with_usage ─────────────────────────────────────────────────────
-- Returns all tags for an owner with their usage count computed server-side.

create or replace function public.get_tags_with_usage(
  p_owner_id uuid
)
returns table(
  id uuid,
  slug text,
  usage_count int
)
language sql
security definer
set search_path = ''
as $$
  select
    t.id,
    t.slug,
    count(i.id)::int as usage_count
  from public.tags t
  left join public.items i
    on i.owner = t.owner
   and i.tags @> to_jsonb(array[t.slug])
  where t.owner = p_owner_id
  group by t.id, t.slug
  order by t.slug;
$$;

-- Grants: v1 service_role only. v2 will re-grant to authenticated.
grant execute on function public.get_tags_with_usage(uuid)
  to service_role;

revoke execute on function public.get_tags_with_usage(uuid)
  from public, anon, authenticated;
