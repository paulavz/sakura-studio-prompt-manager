# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 🌸 Sakura Prompt Studio

Dashboard de gestión de prompts con estética Japandi. Permite organizar, parametrizar (variables `{{ }}`), asignar un agente e inyectar skills sobre prompts en un flujo minimalista.

> Estado: especificación. El primer hito es scaffold de Next.js 14 + Tailwind + Supabase con la arquitectura de este documento.

> **Nota de migración (mayo 2026):** la spec original apuntaba a PocketBase + PocketHost, pero PocketHost no ofrece tier gratuito sin tarjeta. Se sustituyó por **Supabase**, que sí tiene free tier estable y la usuaria ya domina. El modelo de datos se traduce 1:1 a tablas Postgres + RLS.

## Stack

- **Framework:** Next.js 14+ (App Router)
- **Estilos:** Tailwind CSS
- **DB / Backend:** **Supabase** (Postgres + Auth + Row Level Security + Storage si hace falta) — free tier
- **Hosting frontend:** **Vercel** (free tier, integración nativa con Next App Router)
- **Animaciones:** Framer Motion (drawer, lluvia de pétalos, hover glow)
- **Editor markdown WYSIWYG:** **Tiptap** (modo rendered editable)
- **Render markdown + syntax highlight:** `react-markdown` + Shiki
- **Tipografías:** Inter (UI) + JetBrains Mono (código)

## Referencia de diseño (no negociable)

`https://api.anthropic.com/v1/design/h/f-3unLnvyiTxyFB_I9cZUQ?open_file=Sakura+Prompt+Studio.html`

Reglas estéticas:

- Fondo blanco sólido `#FFFFFF`, tipografía negra `#000000`.
- Rosa Sakura `#FFB7C5` reservado para 3 usos exclusivos: glow rosa difuso en hover de cards, chips de variables `{{ }}`, animaciones de feedback. Nunca usarlo en otros componentes.
- Bordes 1px sutiles, padding/gap generosos, cero decoración superflua.
- Tokens (colores, espaciados, fuentes) centralizados en `tailwind.config.ts` — prohibido hardcodear `#FFB7C5` en componentes.

## Modelo de datos (Supabase / Postgres)

Todas las tablas viven en el schema `public`. Las claves primarias son `uuid` con `default gen_random_uuid()`. Toda tabla incluye `created_at timestamptz default now()` y `updated_at timestamptz default now()` (mantenido vía trigger).

### `items`
| campo | tipo Postgres | notas |
|---|---|---|
| `id` | `uuid` PK | `default gen_random_uuid()` |
| `title` | `text` | `not null` |
| `content` | `text` | markdown, `not null default ''` |
| `category` | `text` | `check (category in ('template','plan','data_output','agente','skill'))` |
| `tags` | `jsonb` | array de slugs `snake_case`, `default '[]'::jsonb` |
| `is_favorite` | `boolean` | `default false` |
| `owner` | `uuid` | FK → `auth.users(id)` `on delete cascade`, `not null` |

### `versions`
Snapshot creado **solo al guardar** un item (estricto, no en drafts).

| campo | tipo Postgres | notas |
|---|---|---|
| `id` | `uuid` PK | `default gen_random_uuid()` |
| `item_id` | `uuid` | FK → `items(id)` `on delete cascade`, `not null` |
| `content_snapshot` | `text` | `not null` |
| `created_at` | `timestamptz` | `default now()` |

**Rotación:** al alcanzar 50 versiones por item, borrar las **25 más antiguas** en la misma transacción del nuevo guardado. Implementar como **función Postgres** (`create or replace function rotate_versions(item uuid)`) llamada desde el server action que guarda, o como un único RPC que haga `insert + delete` en una transacción. No avisar al usuario.

### `tags`
Tabla separada para gestión limpia desde Settings.

| campo | tipo Postgres | notas |
|---|---|---|
| `id` | `uuid` PK | `default gen_random_uuid()` |
| `slug` | `text` | `unique not null`, `check (slug ~ '^[a-z][a-z0-9_]*$')` |
| `label` | `text` | display opcional |
| `owner` | `uuid` | FK → `auth.users(id)` `on delete cascade` (tags son por usuario) |

## Auth

- Supabase trae el schema `auth` con la tabla `auth.users` lista.
- **v1 (uso personal):** una única cuenta personal creada manualmente desde el dashboard de Supabase. UI de login deshabilitada (la sesión se establece una vez en el navegador y se guarda; o se trabaja vía service role en server actions). El `owner` de cada item es **el `id` de esa cuenta**.
- **v2 (multi-user):** flipear flag `NEXT_PUBLIC_AUTH_ENABLED` y exponer login (Supabase Auth UI o un formulario propio). El campo `owner` ya está listo desde día 1, no requiere migración.
- **RLS obligatoria desde el inicio** en `items`, `versions` y `tags`. Política base:
  ```sql
  using ( owner = auth.uid() )
  with check ( owner = auth.uid() )
  ```
  Para `versions`, la política se basa en el `owner` del `item_id` referenciado (join lateral o subquery).

## Variables de entorno

| var | descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave pública (anon) — usada en cliente y server con RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | clave de servicio — **solo server**, nunca expuesta al cliente; usada para tareas administrativas o para v1 con sesión efímera |
| `MIN_VAR_LENGTH` | longitud mínima global de inputs de variables `{{ }}` |
| `MAX_VAR_LENGTH` | longitud máxima global (recordar: una variable puede ser un prompt completo, dimensionar generoso) |
| `NEXT_PUBLIC_AUTH_ENABLED` | bool, activa el login multi-user |

## Categorías de contenido

- **Templates** — prompts estructurados (planes, tests, debugging, automatización n8n).
- **Planes prefabricados** — listos para usar, sin inputs.
- **Salida de data** — formatos específicos (Excel/Python, HTML).
- **Agentes** — configs de sistema (ej. `PR.md`).
- **Skills** — fragmentos de conocimiento independientes, inyectables en otros prompts.

## Sistemas centrales

### 1. Motor de variables dinámicas (Drawer)

- Utilidad pura `lib/variables.ts` con regex `{{nombre_variable}}` reusada por: Drawer, indicador 🌸 de la card, motor de reemplazo.
- Botón **"Usar Template"** abre Drawer lateral derecho (Framer Motion).
- Drawer genera un input por variable única detectada. Si la variable se repite en el prompt, **un solo input la reemplaza en todas las ocurrencias**.
- Validación: longitud entre `MIN_VAR_LENGTH` y `MAX_VAR_LENGTH`. Inputs son textarea autosize (variables pueden contener prompts completos).
- Botón **"Copiar Resultado"** procesa el reemplazo en tiempo real, copia al clipboard y dispara la lluvia de pétalos.
- **Sin persistencia:** Drawer es ejecución efímera, no recuerda valores entre sesiones.

### 2. Inyector de Skills

- Botón **"Add Skill"** en la vista de un prompt → despliega lista de items con `category = skill`.
- Al seleccionar una skill, **solo se inyecta texto en el editor** (no guarda en DB):

  ```
  \n\nUsa la skill [Nombre de la Skill] para este desarrollo.
  ```

- El usuario debe pulsar **Guardar** para que la skill quede aplicada (y se cree una nueva versión).
- **Panel "Skills aplicadas":** visible en la vista del item, lista las skills detectadas en el `content` **guardado** (scan literal del string `Usa la skill [X] para este desarrollo.`). No refleja skills añadidas pero no guardadas.
- **Alerta de cambios sin guardar:** si el usuario añade una skill y navega/cambia de modo sin guardar, mostrar warning. Cancelar = descarta (no hay drafts).
- Una skill se inyecta **una sola vez** por prompt (aplica a todo el prompt).

### 2-bis. Asignador de Agente

Paralelo a Skills pero con semántica distinta: un agente define **quién ejecuta** el prompt (rol/persona). Skills definen **qué herramientas/conocimiento** tiene a mano.

- Botón **"Assign Agent"** en la vista de un prompt → despliega lista de items con `category = agente`. **Botón separado** del de "Add Skill" (UX y semántica distintas).
- **Cardinalidad: SINGULAR.** Un prompt tiene como máximo un agente asignado. Práctica estándar en prompting: dos personas fuertes producen output contradictorio.
- **No se pega contenido** del agente. El archivo del agente debe existir en el proyecto destino donde se ejecuta el prompt; el programador decide cómo invocarlo. Aquí solo declaramos la intención.
- Al seleccionar un agente, **solo se inyecta texto en el editor** (no guarda en DB). La línea se inserta al **inicio** del `content` (la persona se establece antes de la tarea — práctica estándar):

  ```
  Actúa como el agente [Nombre del Agente] para este desarrollo.\n\n
  ```

- **Reemplazo automático:** si ya hay un agente asignado y se elige otro, eliminar la línea anterior y escribir la nueva. El detector escanea la línea `Actúa como el agente [X] para este desarrollo.` al inicio del `content`. Si el usuario la movió manualmente o la borró, se trata como "sin agente".
- El usuario debe pulsar **Guardar** para que la asignación persista (genera nueva versión).
- **Panel "Agente asignado":** badge propio en la vista del item, separado del panel de Skills.
  - Si hay agente detectado en el `content` guardado → muestra el nombre.
  - Si no → texto sutil `Sin agente asignado`.
  - No refleja agentes asignados pero no guardados.
- **Alerta de cambios sin guardar:** mismo flujo que Skills.
- Utilidad pura: `lib/agent.ts` (detección, reemplazo, extracción del nombre desde la línea inicial).

### 3. Galería (Opción B)

- Cards minimalistas: solo título + etiquetas.
- Indicador 🌸 discreto junto al título si el prompt contiene variables `{{ }}`.
- **Filtros v1:**
  - Sidebar/tabs por **categoría** (eje principal).
  - Búsqueda fuzzy local por **título**.
  - Toggle de **favoritos** (campo `is_favorite`).
- Filtro por tags → v2.

### 4. Visualizador dual (Rendered ⇄ Raw)

- **Ambos modos son editables** (el usuario no necesariamente maneja markdown).
  - **Rendered:** Tiptap WYSIWYG (modo principal de uso esperado).
  - **Raw:** textarea de markdown plano (uso secundario, para edición precisa).
- **Regla estricta sin drafts:** si hay cambios sin guardar en un modo, **bloquear el cambio al otro modo** hasta que el usuario haga **Guardar** o **Cancelar** (descarta).
- Solo **Guardar** crea entrada en `versions`.

### 5. Versionado

- Snapshot **únicamente al guardar**. Ser estrictos: ni autosave ni drafts.
- Rotación FIFO al pasar de 50 → borrar 25 más antiguas, sin notificación.
- UI: panel de historial con preview y botón "Restaurar versión" (la restauración es a su vez un nuevo guardado → genera otra entrada).

### 6. Gestión de Tags (Settings)

- Panel **Settings → Tags** lista, crea y elimina tags de la collection `tags`.
- Al asignar tags a un item: combo box con dos modos en el mismo input
  1. Seleccionar tags existentes (autocomplete).
  2. **Add new** free-form → valida `snake_case` y crea entrada en `tags` antes de asignar.
- `snake_case` es **obligatorio** y se valida en cliente **y** en `check constraint` Postgres (`slug ~ '^[a-z][a-z0-9_]*$'`).

### 7. Sakura Experience (animaciones)

- **Success feedback:** copiar un prompt (Drawer o vista principal) dispara **lluvia de pétalos** cruzando la pantalla (Framer Motion). Fluida, no intrusiva, ~1.5s.
- **Hover de cards:** transición suave a glow rosa Sakura difuso.
- **Drawer:** slide-in lateral derecho con easing suave.

## Convenciones de implementación

- **App Router** con server components por defecto; client components solo donde haya interactividad (Drawer, animaciones, editor Tiptap, formularios).
- Cliente Supabase con **dos factories** (paquete `@supabase/ssr`):
  - `lib/supabase/server.ts` → cliente para Server Components, Route Handlers y Server Actions (usa cookies para la sesión).
  - `lib/supabase/client.ts` → cliente para Client Components (singleton en el browser).
  - `lib/supabase/admin.ts` (opcional, server-only) → cliente con `service role` para tareas que deben saltar RLS de forma controlada.
- Migraciones SQL versionadas en `supabase/migrations/` (`supabase migration new ...`); evitar cambios manuales no rastreables en el dashboard.
- Utilidades puras en `lib/`:
  - `variables.ts` — detección y reemplazo de `{{ }}`.
  - `skills.ts` — scan de skills aplicadas en un `content`.
  - `agent.ts` — detección, reemplazo y extracción del agente asignado.
  - `versioning.ts` — lógica de snapshot + rotación FIFO (envuelve la RPC Postgres).
  - `tags.ts` — validación `snake_case`.
- No introducir abstracciones especulativas; cada utilidad nace cuando dos componentes la necesitan.

## Decisiones pendientes de validar por el usuario

Las siguientes decisiones se tomaron por defecto y deben confirmarse antes/durante implementación:

1. Detección de skills aplicadas vía scan literal del string `Usa la skill [X] para este desarrollo.` (única vía dado que la inyección es append de texto plano).
2. Detección de agente asignado vía scan literal de `Actúa como el agente [X] para este desarrollo.` al inicio del `content` (mismo principio que skills).
3. Tiptap como editor WYSIWYG del modo rendered.
4. Tabla separada `tags` en Postgres (vs. derivar de `items.tags jsonb`).
