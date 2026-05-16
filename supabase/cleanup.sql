-- Sakura Prompt Studio — Limpieza completa antes de migración de categorías
-- Ejecutar en Supabase Dashboard → SQL Editor → New query.
-- ATENCIÓN: esto borra TODOS los datos del owner v1.

-- Orden respetando foreign keys: versions → items → tags

delete from public.versions
where item_id in (
  select id from public.items where owner = '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid
);

delete from public.items
where owner = '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid;

delete from public.tags
where owner = '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid;
