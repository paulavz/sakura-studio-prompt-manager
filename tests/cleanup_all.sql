-- Sakura Prompt Studio — Full cleanup for test owner
-- Deletes ALL items, versions (cascade), and tags for the v1 test owner.
-- Run in Supabase SQL Editor or via psql.

-- Replace with your actual v1 user UUID
-- \set owner_uuid '7f13129c-5676-4e92-843a-76ee817dfcf3'

DELETE FROM public.versions
WHERE item_id IN (
  SELECT id FROM public.items WHERE owner = :owner_uuid
);

DELETE FROM public.items
WHERE owner = :owner_uuid;

DELETE FROM public.tags
WHERE owner = :owner_uuid;
