-- Fase 4.2: Add sqlstate to save_item_with_version exception block.
-- Replaces 20260513120001 with an identical function body except the
-- exception handler now also returns the Postgres SQLSTATE code, which
-- makes it easier to distinguish constraint violations from other errors
-- in server logs.

create or replace function public.save_item_with_version(
  p_item_id uuid,
  p_owner uuid,
  p_title text,
  p_content text,
  p_category text,
  p_tags jsonb,
  p_applied_skills jsonb,
  p_is_favorite boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  -- 1. Update item (owner check enforces RLS)
  update public.items
  set
    title = p_title,
    content = p_content,
    category = p_category,
    tags = p_tags,
    applied_skills = p_applied_skills,
    is_favorite = p_is_favorite,
    updated_at = now()
  where id = p_item_id and owner = p_owner;

  if not found then
    raise exception 'Item not found or owner mismatch';
  end if;

  -- 2. Insert version snapshot
  insert into public.versions (item_id, content_snapshot, applied_skills_snapshot)
  values (p_item_id, p_content, p_applied_skills);

  -- 3. Rotate old versions silently
  perform public.rotate_versions(p_item_id);

  v_result := jsonb_build_object('success', true, 'content', p_content);
  return v_result;

exception when others then
  v_result := jsonb_build_object(
    'success', false,
    'error', sqlerrm,
    'sqlstate', sqlstate
  );
  return v_result;
end;
$$;
