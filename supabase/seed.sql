-- Sakura Prompt Studio — Seeds de prueba (Fase 2)
--
-- INSTRUCCIONES:
-- 1. Copia tu UUID de usuario v1 desde Supabase Dashboard → Auth → Users.
-- 2. Reemplaza 'd03d60cc-64f0-49f2-8a35-c39fefa6ef8c' abajo con ese valor (incluye las comillas).
-- 3. Ejecuta este script en Supabase Dashboard → SQL Editor → New query.
--
-- Nota: si ya tienes items creados manualmente, puedes saltar este archivo.

insert into public.items (title, content, category, tags, is_favorite, owner)
values
  (
    'Plan de testing E2E',
    'Crea un plan de testing end-to-end para {{nombre_proyecto}} usando Playwright.',
    'plan',
    '["testing", "playwright"]'::jsonb,
    true,
    'd03d60cc-64f0-49f2-8a35-c39fefa6ef8c'::uuid
  ),
  (
    'Template PR Review',
    'Revisa este PR siguiendo las guidelines del proyecto.',
    'template',
    '["code_review", "git"]'::jsonb,
    false,
    'd03d60cc-64f0-49f2-8a35-c39fefa6ef8c'::uuid
  ),
  (
    'Generar HTML semántico',
    'Dado el siguiente diseño, genera el HTML semántico correspondiente.',
    'data_output',
    '["frontend", "html"]'::jsonb,
    false,
    'd03d60cc-64f0-49f2-8a35-c39fefa6ef8c'::uuid
  ),
  (
    'Agente — Senior Frontend',
    'Actúa como el agente Senior Frontend Engineer para este desarrollo.\n\nTu tarea es refactorizar el componente dado aplicando patrones de composición.',
    'agente',
    '["rol", "frontend"]'::jsonb,
    true,
    'd03d60cc-64f0-49f2-8a35-c39fefa6ef8c'::uuid
  ),
  (
    'Skill — Validación de forms',
    '\n\nUsa la skill Validación de Formularios para este desarrollo.',
    'skill',
    '["forms", "ux"]'::jsonb,
    false,
    'd03d60cc-64f0-49f2-8a35-c39fefa6ef8c'::uuid
  ),
  (
    'Automatización n8n',
    'Construye un workflow en n8n que reciba un webhook de {{servicio_origen}} y envíe los datos formateados a {{servicio_destino}}.',
    'template',
    '["automation", "n8n"]'::jsonb,
    false,
    'd03d60cc-64f0-49f2-8a35-c39fefa6ef8c'::uuid
  ),
  (
    'Salida Excel desde Python',
    'Genera un script de Python que lea {{archivo_entrada}} y produzca un archivo Excel con las columnas: ID, Nombre, Estado.',
    'data_output',
    '["python", "excel"]'::jsonb,
    false,
    'd03d60cc-64f0-49f2-8a35-c39fefa6ef8c'::uuid
  ),
  (
    'Plan de migración de BD',
    'Define un plan paso a paso para migrar la base de datos de {{motor_actual}} a {{motor_nuevo}} sin downtime.',
    'plan',
    '["database", "migration"]'::jsonb,
    true,
    'd03d60cc-64f0-49f2-8a35-c39fefa6ef8c'::uuid
  );
