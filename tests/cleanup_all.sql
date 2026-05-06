-- Sakura Prompt Studio — Full cleanup for test owner
-- Deletes ALL items, versions (cascade), and tags for the v1 test owner.
-- Run in Supabase SQL Editor or via psql.

-- Replace with your actual v1 user UUID
-- \set owner_uuid 'd03d60cc-64f0-49f2-8a35-c39fefa6ef8c'

DELETE FROM public.versions
WHERE item_id IN (
  SELECT id FROM public.items WHERE owner = :owner_uuid
);

DELETE FROM public.items
WHERE owner = :owner_uuid;

DELETE FROM public.tags
WHERE owner = :owner_uuid;
