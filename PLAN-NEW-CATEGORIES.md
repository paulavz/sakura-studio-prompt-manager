# Plan: nuevas categorías (Templates / Plans / Reports / Outputs / Messaging) sincronizadas en DB + sidebar + modal

## Skills obligatorias (de `.agents/skills/`)

El agente que ejecute este plan **debe consultar** estas skills antes/durante la implementación. No son opcionales — son los manuales internos del proyecto:

- `.agents/skills/supabase-postgres-best-practices/SKILL.md` — migración SQL (RLS, CHECK constraints, transacciones, idempotencia, drop column seguro).
- `.agents/skills/tailwind-design-system/SKILL.md` — iconos/estilo del sidebar (tokens, no hardcodear `#FFB7C5`, paleta Japandi declarada en `CLAUDE.md`).
- `.agents/skills/vercel-react-best-practices/SKILL.md` — `components/sidebar.tsx` y modal (memo, derived state, no inline components).
- `.agents/skills/vercel-composition-patterns/SKILL.md` — modal de creación y sidebar (avoid boolean props, explicit variants).
- `.agents/skills/webapp-testing/SKILL.md` — e2e nuevos y prevenir regresiones.

> Si una skill no aplica a un subtask concreto, anótalo y sigue, pero al menos los SKILL.md de Supabase y Tailwind son lectura **obligatoria** antes de tocar la migración o el sidebar.

---

## Contexto

El diseño actual usa 3 categorías top-level: `template`, `agente`, `skill`. `template` tiene subcategorías `Planes | Test | Debug | n8n`. Ver `lib/database.types.ts:1-37` y `supabase/migrations/20260515120001_drop_legacy_categories_add_subcategory.sql`.

El **diseño nuevo** está en `design/v4.html` (1.6 MB). El bundle extraído vive en `design/_extracted/` tras correr `python design/_extract_bundle.py design/v4.html`. La sección Sidebar es `design/_extracted/7dfc1adf-0f8c-4247-aa74-50e3e313cd82.bin` (texto plano JSX a pesar de la extensión).

El nuevo diseño promueve **5 categorías nuevas** agrupadas bajo un encabezado `Workspace` en la sidebar (extraído de `7dfc1adf...:170-184`):

```
Workspace
  ▦ Templates
  ◐ Plans
  ▤ Reports
  ⬚ Outputs
  ✉ Messaging
```

Agents y Skills se mantienen como secciones propias del sidebar (con iconos `◇` y `✦` respectivamente). El icono de Agents cambia: hoy es `⌥`, en v4 es `◇`.

---

## Decisiones resueltas con la usuaria

| Q | Decisión | Consecuencia |
|---|----------|--------------|
| **Q1** | Agents y Skills **siguen siendo categorías** (valores de `items.category`), no se ocultan ni se mueven a tabla aparte. | `check (category in ...)` admite 7 valores: `template`, `plan`, `report`, `output`, `messaging`, `agente`, `skill`. |
| **Q1.a** | La modal de creación lista **las 7 categorías** en el dropdown. | `CATEGORIES` en `lib/database.types.ts` tiene los 7 valores. La sidebar las renderiza en 3 bloques (Workspace, Agents, Skills). |
| **Q2** | Se **elimina `subcategory` por completo**. No habrá Test / Debug / n8n como subcategorías. Plans pasa a ser categoría top-level propia. | La migración debe dropear la columna `items.subcategory` (con backfill de los Planes existentes a `category='plan'`). `TemplateSubcategory` desaparece del código. |
| **Q3** | La usuaria no sabe el estado actual de la DB — el implementador debe averiguarlo antes de migrar (`select category, subcategory, count(*) from items group by 1,2`). | Bloquea el orden de la migración pero no el plan. |

> 🌸 **Nota Sakura:** el rosa sigue reservado a los 6 usos enumerados en `CLAUDE.md`. Las 5 categorías nuevas usan paleta neutra (negro / gris). Si el diseño v4 introduce un uso adicional documentable, anotarlo en `CLAUDE.md`.

---

## Orden de ejecución

```
1. (Implementador) Averigua estado actual de la DB (Paso 0).
2. (Implementador) Redacta la migración SQL (Paso 1). NO la aplica.
3. (Usuaria) Revisa el SQL, hace backup, aplica la migración manualmente.
                  Confirma con select count(*) by category.
4. (Implementador) Actualiza types (Paso 2), sidebar (Paso 3),
                   modal de creación (Paso 4), tests (Paso 6).
5. (Implementador) Corre npm run dev y verifica.
6. (Implementador) Corre e2e; ajusta visuales si rompen.
7. (Implementador) Actualiza CLAUDE.md (Paso 7).
8. (Implementador) Commit en la rama improve-design.
```

---

## Paso 0 — Averiguar estado de la DB (Q3)

Antes de redactar la migración, el implementador (o la usuaria si corre Supabase localmente) debe ejecutar:

```sql
select category, subcategory, count(*) as n
  from public.items
  group by 1, 2
  order by 1, 2;
```

Reportar resultado en el PR. Eso determina:
- Si hay items con `category='template'` y `subcategory='Planes'` que hay que migrar a `category='plan'`.
- Si hay valores inesperados de `subcategory` (Test/Debug/n8n) que perderemos al dropear la columna — la usuaria decide si los moveremos a `tags` (`test`, `debug`, `n8n` en snake_case) antes de dropear, o los descartamos.

**Decisión por defecto si la usuaria no responde:** copiar `subcategory` no nulo a `tags` (concatenándolo con los existentes, en snake_case) antes de dropear, para no perder información.

---

## Paso 1 — Migración SQL (la usuaria la corre, no el agente)

Archivo nuevo: `supabase/migrations/<timestamp>_add_top_level_categories_drop_subcategory.sql`

Aplicar `supabase-postgres-best-practices/SKILL.md` para revisar idempotencia, RLS y orden de operaciones.

Contenido (template — ajustar según resultado de Paso 0):

```sql
-- Sakura Prompt Studio — Add 5 top-level categories + drop subcategory column.
--
-- Decisions: PLAN-NEW-CATEGORIES.md (Q1, Q1.a, Q2, Q3 resolved).
--   - New categories: plan | report | output | messaging.
--   - 'agente' and 'skill' preserved as categories.
--   - subcategory column is dropped. Existing Planes migrated to category='plan'.
--   - Other non-null subcategories (Test / Debug / n8n) are backfilled into tags
--     (snake_case) before the column drop so the information is not lost.

begin;

-- 1. Drop existing CHECK constraint on items.category
do $$
declare con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.items'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%category%';
  if con_name is not null then
    execute format('alter table public.items drop constraint %I', con_name);
  end if;
end $$;

-- 2. Re-add the constraint with the 7 allowed values
alter table public.items
  add constraint items_category_check
  check (category in (
    'template', 'plan', 'report', 'output', 'messaging',
    'agente', 'skill'
  ));

-- 3. Migrate Planes → category='plan'
update public.items
   set category = 'plan',
       subcategory = null
 where category = 'template'
   and subcategory = 'Planes';

-- 4. Preserve Test / Debug / n8n as tags before dropping the column.
--    snake_case slugs are valid per the existing tags CHECK constraint.
update public.items
   set tags = (
     case
       when not (tags ? lower(subcategory))
         then tags || to_jsonb(lower(subcategory))
       else tags
     end
   )
 where subcategory in ('Test', 'Debug', 'n8n')
   and subcategory is not null;

-- 5. Drop the subcategory column entirely
alter table public.items drop column if exists subcategory;

commit;
```

**Cosas a verificar antes de aplicar** (la usuaria):
- Snapshot/backup del proyecto Supabase desde el dashboard.
- `select * from items where category in ('plan','report','output','messaging') limit 1` → debe devolver 0 filas (no debería haber valores raros pre-migración).
- Grep en `supabase/migrations/` por usos del literal `'subcategory'` o `'Planes'` en otras migraciones, RPCs o triggers — debería estar solo en `20260515120001`.
- Tags `test`, `debug`, `n8n` no existen ya como filas de `public.tags`. Si no existen, hay que **insertarlas previamente** (RLS por `owner`):
  ```sql
  insert into public.tags (slug, owner)
    select v.slug, i.owner
    from (values ('test'), ('debug'), ('n8n')) as v(slug)
    cross join (select distinct owner from public.items
                where subcategory in ('Test','Debug','n8n')) as i
    on conflict do nothing;
  ```
  Añadir este bloque al SQL **antes** del paso 4 si la consulta de Paso 0 reveló subcategorías Test/Debug/n8n con datos. Si no, omitir.

**Cómo correrla:**

```bash
supabase db push        # vía CLI
# o copy/paste en el SQL Editor del dashboard
```

**Validación post-migración** (la usuaria):

```sql
select category, count(*) from public.items group by 1 order by 1;
-- Debe listar solo: agente, messaging?, output?, plan?, report?, skill, template
-- (los valores presentes dependen del estado pre-migración)

select column_name from information_schema.columns
  where table_schema='public' and table_name='items';
-- subcategory NO debe aparecer.
```

---

## Paso 2 — Tipos TypeScript (`lib/database.types.ts`)

Reescritura propuesta:

```ts
export type ItemCategory =
  | "template"
  | "plan"
  | "report"
  | "output"
  | "messaging"
  | "agente"
  | "skill";

export interface AppliedSkill {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  title: string;
  content: string;
  category: ItemCategory;
  tags: string[];
  applied_skills: AppliedSkill[];
  is_favorite: boolean;
  owner: string;
  created_at: string;
  updated_at: string;
}
// NOTE: subcategory removed from Item.

// Order in which categories appear in the New Prompt dropdown.
// 7 entries: 5 Workspace + Agents + Skills.
export const CATEGORIES: ItemCategory[] = [
  "template", "plan", "report", "output", "messaging",
  "agente", "skill",
];

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  template: "Templates",
  plan: "Plans",
  report: "Reports",
  output: "Outputs",
  messaging: "Messaging",
  agente: "Agents",
  skill: "Skills",
};

// Icons taken from design/_extracted/7dfc1adf-...bin (v4 sidebar).
export const CATEGORY_ICONS: Record<ItemCategory, string> = {
  template: "▦",
  plan: "◐",
  report: "▤",
  output: "⬚",
  messaging: "✉",
  agente: "◇",   // changed from ⌥ in current code
  skill: "✦",
};

// Visual grouping for the sidebar.
// Workspace = the 5 promoted categories.
// Agents / Skills get their own section, matching the v4 design.
export const WORKSPACE_CATEGORIES: ItemCategory[] = [
  "template", "plan", "report", "output", "messaging",
];

// Removed: TemplateSubcategory, TEMPLATE_SUBCATEGORIES.
```

**Buscar y eliminar todos los usos de `subcategory`, `TemplateSubcategory`, `TEMPLATE_SUBCATEGORIES`:**

```bash
grep -rn "subcategory\|TemplateSubcategory\|TEMPLATE_SUBCATEGORIES" \
  --include="*.ts" --include="*.tsx" \
  app/ components/ hooks/ lib/ tests/
```

Probables hits: `components/sidebar.tsx`, `components/gallery.tsx`, `components/item-view.tsx`, `app/actions.ts` (no debería), seeds, tests. **Todos** deben quitarse o re-mapearse.

---

## Paso 3 — Sidebar (`components/sidebar.tsx`)

### 3.1. Estructura final (con iconos exactos del diseño v4)

```
┌─ Branding ──────────────┐
│ 🌸 Sakura Studio        │
│    Prompt Manager       │
└─────────────────────────┘
┌─ Search ────────────────┐
│ 🔍 Search…              │
└─────────────────────────┘

Home
  ◈ All Prompts        N
  ♡ Favorites          N

Workspace               ← grupo nuevo, label exacto del diseño
  ▦ Templates          N
  ◐ Plans              N
  ▤ Reports            N
  ⬚ Outputs            N
  ✉ Messaging          N

Agents
  ◇ All Agents         N    ← icono cambió de ⌥ a ◇

Skills
  ✦ All Skills         N

⚙ Settings
🌸 (CherryBranch SVG)
● In flow
```

### 3.2. Cambios concretos en `components/sidebar.tsx`

- **Quitar `SUBCATEGORY_ICONS`** (líneas 60-65) y todos los usos.
- **Quitar import de `TEMPLATE_SUBCATEGORIES`** (línea 5).
- **Añadir imports** de `WORKSPACE_CATEGORIES`, `CATEGORY_ICONS`, `CATEGORY_LABELS` (ya importado).
- **Reescribir `counts`** (líneas 78-94):
  ```ts
  const counts = useMemo(() => {
    const all = items.length;
    const favorites = items.filter((i) => i.is_favorite).length;
    const byCategory: Record<ItemCategory, number> = {
      template: 0, plan: 0, report: 0, output: 0, messaging: 0,
      agente: 0, skill: 0,
    };
    for (const item of items) byCategory[item.category]++;
    return { all, favorites, byCategory };
  }, [items]);
  ```
  (Aplicar `vercel-react-best-practices/rules/rerender-memo.md` — envolver en `useMemo`.)
- **Quitar `bySubcategory`** entero.
- **Sección `Workspace` nueva** sustituyendo a la sección `Templates` actual (líneas 187-208):
  ```tsx
  <NavGroup label="Workspace" storageKey="workspace" defaultOpen={true}>
    {WORKSPACE_CATEGORIES.map((cat) => {
      const isActive = !settingsActive
        && selectedCategory === cat
        && !selectedSubcategory; // selectedSubcategory siempre será null tras la migración
      return (
        <li key={cat}>
          <button
            onClick={() => handleSelect(cat)}
            className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-[12px] py-[6px] text-[13px] transition-colors ${
              isActive
                ? "bg-gray-100 text-black font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-black font-normal"
            }`}
          >
            <div className="flex items-center gap-[8px]">
              <span className={`text-[13px] ${isActive ? "opacity-100" : "opacity-70"}`}>
                {CATEGORY_ICONS[cat]}
              </span>
              <span>{CATEGORY_LABELS[cat]}</span>
            </div>
            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-[10px] px-[6px] py-[1px] min-w-[18px] text-center">
              {counts.byCategory[cat]}
            </span>
          </button>
        </li>
      );
    })}
  </NavGroup>
  ```
- **Sección `Agents`**: mantener la estructura (línea 210-229) pero usar `CATEGORY_ICONS.agente` (`◇`) en vez del literal `⌥`. Etiqueta `"All Agents"` se mantiene.
- **Sección `Skills`**: mantener tal cual (icono `✦` no cambió).
- **`selectedSubcategory` prop**: como ya no existe, **eliminarla del componente y de todos los callers** (`components/gallery.tsx:18, 32, 59, 71`). Si la usuaria quiere conservarla por si vuelve subcategoría en el futuro, dejar la prop pero documentar que siempre será `null` — recomendación: **eliminarla**, abogando por simplicidad.

### 3.3. Cambios en `components/gallery.tsx`

- Quitar `selectedSubcategory` state (línea 18).
- Quitar filtro por subcategory en `filteredItems` (líneas 32-34).
- Quitar `selectedSubcategory` de `filterLabel` (línea 53-58).
- `handleSelectCategory` simplifica a `(cat) => { setSelectedCategory(cat); setSelectedItemId(null); }`.

### 3.4. Cambios en `components/item-view.tsx`

Grep por `subcategory`. Si se mostraba en el header del viewer, quitar.

### 3.5. Iconos: copy-paste o SVG?

El diseño v4 usa unicode glyphs. Mantener glyphs (no introducir SVG nuevo). Verificar render en macOS / Windows / Linux porque algunos glyphs (`⬚`, `◐`) varían entre fuentes. Si en Windows el glyph se ve roto, considerar reemplazar por SVG inline copiando el path del Cherry Branch como referencia de estilo.

---

## Paso 4 — Modal de creación (`components/new-item-modal.tsx`)

Esta modal **aún no existe** — está pendiente en `PLAN-NEW-ITEM-MODAL.md`. Cuando se implemente (o si ya se está implementando en paralelo), el `<select>` de categoría debe alimentarse de `CATEGORIES`, no de un literal:

```tsx
<select id="new-item-category" value={category} onChange={...}>
  {CATEGORIES.map((cat) => (
    <option key={cat} value={cat}>
      {CATEGORY_LABELS[cat]}
    </option>
  ))}
</select>
```

Resultado visible al usuario (las 7 etiquetas, en este orden):

```
Templates
Plans
Reports
Outputs
Messaging
Agents
Skills
```

> Opcional UX: agrupar el `<select>` con `<optgroup label="Workspace">` para las 5 primeras y `<optgroup label="Library">` para Agents/Skills. No es obligatorio para v1.

---

## Paso 5 — Server actions (`app/actions.ts`)

- `createItem` valida con `isValidCategory` → `CATEGORIES.includes(...)`. Como `CATEGORIES` se amplía a 7, valida solo. **Sin cambios.**
- `getSkills` filtra por `category = 'skill'` (línea 158). **Sin cambios.**
- `getAgents` filtra por `category = 'agente'` (línea 257). **Sin cambios.**
- Resto de actions: no dependen de la categoría.

> Verificar que la action `createItem` no escribe en `subcategory` (no debería; revisar `app/actions.ts:33-44`). Si lo hace, quitar.

---

## Paso 6 — Tests

Aplicar `webapp-testing/SKILL.md`.

### 6.1. Tests existentes a actualizar

```bash
grep -rn "subcategory\|Planes\|Test\|Debug\|n8n\|TemplateSubcategory" tests/
```

Probables hits:
- `tests/e2e/settings-navigation.spec.ts` — si el sidebar cambia, los selectores de Templates/Plans cambian.
- `tests/visual/helpers/seed.ts` — si siembra items con subcategory, quitar el campo.
- `tests/e2e/viewer-edit-mode.spec.ts` — si crea items con categoría hardcodeada, asegurarse de que la categoría usada existe.
- `tests/e2e/viewer-history-agent-skills.spec.ts` — no debería tocar subcategoría, pero verificar.

### 6.2. Tests nuevos

Añadir en `tests/e2e/`:

- **`sidebar-categories.spec.ts`**:
  - Carga `/`. Espera que aparezcan los 6 labels: `All Prompts`, `Favorites`, `Templates`, `Plans`, `Reports`, `Outputs`, `Messaging`, `All Agents`, `All Skills`.
  - Por cada categoría: crear un item desde el API (o desde la modal si ya existe), click en el nav item, asertar que la galería muestra ese item.
  - Asertar contadores correctos (`count(*) where category=X`).

- **`new-item-categories.spec.ts`**:
  - Abrir modal "New prompt". Comprobar que el dropdown contiene exactamente 7 opciones con labels `Templates, Plans, Reports, Outputs, Messaging, Agents, Skills` en ese orden.
  - Crear 1 item por categoría, validar que aparece en la sección correcta del sidebar.

### 6.3. Visual

`tests/visual/variable-chips.spec.ts` y similares. El sidebar cambia → snapshots viejos se rompen. Tras revisión humana, regenerar con `playwright test --update-snapshots` solo si la usuaria lo aprueba.

---

## Paso 7 — Documentación

- **`CLAUDE.md § "Categorías de contenido"`**: reescribir entero con las 7 categorías nuevas. Eliminar referencias a `Planes`, `Test`, `Debug`, `n8n` y a `subcategory`.
- **`CLAUDE.md § "Modelo de datos"`**: quitar la fila `subcategory` de la tabla `items`. Actualizar el `check` constraint reflejado en docs.
- **`CLAUDE.md § "Decisiones pendientes"`**: cerrar Q1, Q2, Q3 documentando las respuestas.
- **`PLAN-DESIGN-DELTA-V2.md`**: marcar como obsoleto con un nota apuntando a este plan.
- **`PLAN-NEW-ITEM-MODAL.md`**: actualizar el bullet de "Subcategory" diciendo que ya no aplica.

---

## Verificación end-to-end (manual)

1. `npm run dev` → home (`/`).
2. Sidebar muestra **exactamente**: Home (All Prompts, Favorites), Workspace (5 items), Agents (1), Skills (1), Settings.
3. Iconos correctos: ◈ ♡ | ▦ ◐ ▤ ⬚ ✉ | ◇ | ✦ | ⚙.
4. Cada nav item tiene su contador y coincide con `select count(*) from items where category=X`.
5. Click en cada nav item → la galería se filtra; header muestra el nombre y recuento.
6. Click "+" → modal abre. Dropdown lista 7 opciones (`Templates, Plans, Reports, Outputs, Messaging, Agents, Skills`).
7. Crear un item con cada categoría → aparece en su sección del sidebar.
8. Abrir un item nuevo → "Add Skill" y "Assign Agent" siguen funcionando (regresión cubierta por el fix de skills que la usuaria ya validó).
9. Verificar en DB: `select category, count(*) from items group by 1` cuadra con los contadores del sidebar.
10. Confirmar que `select column_name from information_schema.columns where table_schema='public' and table_name='items'` no incluye `subcategory`.
11. Restaurar una versión vieja desde el history drawer → no falla.

---

## Archivos críticos (referencia)

- `lib/database.types.ts:1-37` — tipos y constantes.
- `components/sidebar.tsx:60-251` — render del sidebar.
- `components/gallery.tsx:17-64` — selectedSubcategory state, filtros, handleSelectCategory.
- `components/item-view.tsx` — buscar usos de subcategory si los hay.
- `components/new-item-modal.tsx` — pendiente (`PLAN-NEW-ITEM-MODAL.md`).
- `app/actions.ts:15-52, 149-168, 248-267` — `createItem`, `getSkills`, `getAgents`.
- `supabase/migrations/20260515120001_drop_legacy_categories_add_subcategory.sql` — migración previa, modelo.
- `supabase/seed.sql` — datos de ejemplo; sembrar items por cada nueva categoría.
- `design/v4.html` — fuente de verdad visual (la usuaria la mantiene).
- `design/_extracted/7dfc1adf-0f8c-4247-aa74-50e3e313cd82.bin` — JSX del Sidebar v4, fuente de iconos.
- `CLAUDE.md` — secciones a actualizar (categorías, modelo, decisiones pendientes).
- `tests/e2e/*.spec.ts`, `tests/visual/*.spec.ts` — a revisar y añadir.

## No-objetivos

- No refactorizar Tiptap ni el flow de skills aplicadas.
- No tocar Auth ni RLS (políticas basadas en `owner`; no dependen de `category`).
- No renombrar `category='agente'` a `'agent'` en este pase.
- No introducir un sistema de iconos SVG nuevo si los glyphs unicode renderizan bien en Windows/macOS. Si fallan en Windows, ese reemplazo es un mini-plan aparte.
- No añadir UI separada para gestionar Agents/Skills — se siguen creando desde la modal "New prompt" eligiendo la categoría correspondiente.
