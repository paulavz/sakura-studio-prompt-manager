-- Sakura Prompt Studio — Seeds de prueba (Fase 2, schema 2026-05-15)
--
-- INSTRUCCIONES:
-- 1. Tu UUID de usuario v1 es: 7f13129c-5676-4e92-843a-76ee817dfcf3
-- 2. Ejecuta este script en Supabase Dashboard → SQL Editor → New query.
--
-- Este script es IDEMPOTENTE: borra primero los datos existentes del owner
-- y luego los vuelve a insertar. Puedes ejecutarlo tantas veces como quieras.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. LIMPIEZA (cascade: versions → items → tags)
-- ═══════════════════════════════════════════════════════════════════════════════

delete from public.versions
where item_id in (
  select id from public.items where owner = '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid
);

delete from public.items
where owner = '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid;

delete from public.tags
where owner = '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. TAGS (deben existir antes que los items por el trigger de integridad)
-- ═══════════════════════════════════════════════════════════════════════════════

insert into public.tags (slug, label, owner)
values
  ('testing',      'Testing',      '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid),
  ('playwright',   'Playwright',   '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid),
  ('code_review',  'Code Review',  '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid),
  ('git',          'Git',          '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid),
  ('frontend',     'Frontend',     '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid),
  ('html',         'HTML',         '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid),
  ('rol',          'Rol',          '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid),
  ('forms',        'Forms',        '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid),
  ('ux',           'UX',           '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid),
  ('automation',   'Automation',   '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid),
  ('n8n',          'n8n',          '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid),
  ('python',       'Python',       '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid),
  ('excel',        'Excel',        '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid),
  ('database',     'Database',     '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid),
  ('migration',    'Migration',    '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. ITEMS
-- ═══════════════════════════════════════════════════════════════════════════════

insert into public.items (title, content, category, subcategory, tags, is_favorite, owner)
values
  (
    'Plan de testing E2E',
    'Crea un plan de testing end-to-end para {{nombre_proyecto}} usando Playwright.',
    'template',
    'Planes',
    '["testing", "playwright"]'::jsonb,
    true,
    '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid
  ),
  (
    'Template PR Review',
    'Revisa este PR siguiendo las guidelines del proyecto.',
    'template',
    null,
    '["code_review", "git"]'::jsonb,
    false,
    '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid
  ),
  (
    'Generar HTML semantico',
    'Dado el siguiente diseno, genera el HTML semantico correspondiente.',
    'template',
    null,
    '["frontend", "html"]'::jsonb,
    false,
    '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid
  ),
  (
    'Agente — Senior Frontend',
    'Actua como el agente Senior Frontend Engineer para este desarrollo.\n\nTu tarea es refactorizar el componente dado aplicando patrones de composicion.',
    'agente',
    null,
    '["rol", "frontend"]'::jsonb,
    true,
    '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid
  ),
  (
    'Skill — Validacion de forms',
    '\n\nUsa la skill Validacion de Formularios para este desarrollo.',
    'skill',
    null,
    '["forms", "ux"]'::jsonb,
    false,
    '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid
  ),
  (
    'Automatizacion n8n',
    'Construye un workflow en n8n que reciba un webhook de {{servicio_origen}} y envie los datos formateados a {{servicio_destino}}.',
    'template',
    'n8n',
    '["automation", "n8n"]'::jsonb,
    false,
    '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid
  ),
  (
    'Salida Excel desde Python',
    'Genera un script de Python que lea {{archivo_entrada}} y produzca un archivo Excel con las columnas: ID, Nombre, Estado.',
    'template',
    null,
    '["python", "excel"]'::jsonb,
    false,
    '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid
  ),
  (
    'Plan de migracion de BD',
    'Define un plan paso a paso para migrar la base de datos de {{motor_actual}} a {{motor_nuevo}} sin downtime.',
    'template',
    'Planes',
    '["database", "migration"]'::jsonb,
    true,
    '7f13129c-5676-4e92-843a-76ee817dfcf3'::uuid
  );
