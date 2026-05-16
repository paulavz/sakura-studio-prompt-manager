# Plan de Correcciones — Sakura Prompt Studio (v1)

> Plan derivado del code review. Foco en v1 (cuenta única, sin auth UI).
> Cada fase es independiente y entregable por separado. El orden sugerido
> minimiza retrabajo: primero corrección de datos, luego refactor, luego pulido.

---

## Resumen por fases

| Fase | Tema | Tamaño | Bloqueante de | Riesgo |
|---|---|---|---|---|
| 1 | Corrección de datos | M | nada | bajo |
| 2 | Refactor de `ItemView` | L | Fase 3 | medio |
| 3 | Modelo de estado agent/skill | M | — | medio |
| 4 | Pulido, tests y resiliencia | S–M | — | bajo |
| 5 | Marcador de deuda v2 | XS | — | nulo |

**Tamaños:** XS = <30 min · S = ~1 h · M = ~2–3 h · L = ~half-day

---

## Fase 1 — Corrección de datos (🔴 prioridad alta)

**Objetivo:** eliminar inconsistencias silenciosas en guardado y renderizado.

### 1.1 Atomicidad de `saveItemComplete`

**Problema:** `update items` → `insert versions` → `rpc rotate_versions` corren como tres llamadas separadas. Si la segunda falla tras la primera, el item queda guardado sin snapshot de versión.

**Pasos:**
1. Crear migración `supabase/migrations/<timestamp>_save_item_with_version.sql`:
   - Función Postgres `save_item_with_version(p_item_id, p_owner, p_title, p_content, p_category, p_tags, p_applied_skills, p_is_favorite)`.
   - Cuerpo en una transacción: UPDATE `items` (con WHERE owner = p_owner), INSERT `versions`, llamada a `rotate_versions(p_item_id)`.
   - Devuelve `{ content }` (o lanza on error → Supabase lo propaga al cliente).
   - `SECURITY DEFINER` solo si necesario; preferir `SECURITY INVOKER` ya que se invoca con admin client.
2. Refactor `lib/versioning.ts`:
   - Reemplazar las 3 llamadas por `admin.rpc("save_item_with_version", { ... })`.
   - Mantener la misma signatura pública (`saveItemComplete`).
   - Mantener el `console.warn` envolvente para errores de rotación → ahora la rotación va dentro del RPC, así que pasa a error duro (correcto).
3. Validar manualmente:
   - Guardar un item → verificar entrada en `versions`.
   - Forzar fallo (ej. tag inválido en la jsonb) y confirmar que el `items` no quedó actualizado.

**Archivos tocados:** `supabase/migrations/*.sql` (nuevo), `lib/versioning.ts`.

---

### 1.2 Chips de variables no deben renderizarse dentro de bloques de código

**Problema:** `markdown.ts:18` corre el regex `{{var}} → <span>` sobre el HTML completo, sustituyendo también dentro de `<pre>`/`<code>`. Un prompt sobre prompting (caso real de uso) verá sus ejemplos corrompidos.

**Pasos:**
1. Refactor `lib/markdown.ts`:
   - Tras `marked.parse`, parsear el HTML resultante (usar `DOMParser` en cliente o `linkedom` server-side — elegir uno que funcione en ambos contextos; `node-html-parser` es liviano y universal).
   - Recorrer `TreeWalker`/nodos de texto, **saltar** cuando el ancestro sea `<pre>` o `<code>`.
   - Reemplazar `{{var}}` solo en nodos de texto restantes.
   - Si no se quiere añadir dependencia: regex con lookahead que excluya secuencias entre `<pre>...</pre>` y `<code>...</code>` — más frágil, menos recomendable.
2. Añadir test en `lib/__tests__/markdown.test.ts`:
   - `{{foo}}` en párrafo → renderiza como chip.
   - `{{foo}}` dentro de ``` fenced ``` → permanece literal.
   - `{{foo}}` dentro de \`inline code\` → permanece literal.

**Archivos tocados:** `lib/markdown.ts`, `lib/__tests__/markdown.test.ts` (nuevo), posiblemente `package.json` (dependencia HTML parser).

---

## Fase 2 — Refactor de `ItemView` (🟡 arquitectura)

**Objetivo:** bajar `components/item-view.tsx` de 641 líneas a ~150, con responsabilidades separadas y testables.

> **Prerrequisito recomendado:** completar Fase 1 antes, para no mover código que aún va a cambiar de comportamiento.

### 2.1 Extraer hook `useItemDraft`

**Pasos:**
1. Nuevo archivo `lib/hooks/use-item-draft.ts`.
2. Mueve a este hook:
   - State `committed`, `editedContent`, `title`, `category`, `tags`, `isFavorite`, `appliedSkills`.
   - Cálculo de `isContentDirty` (ver mejora en Fase 2.4).
   - `commitSave`, `handleCancel`, `handleSave`, `handleRestoreVersion`.
3. Expone:
   ```ts
   { committed, draft, isDirty, setField, save, cancel, restore, isSaving, error }
   ```
4. `ItemView` consume el hook; los handlers internos del componente se reducen a glue.

---

### 2.2 Extraer `ItemHeader`

**Contenido:** estrella favorito, input de título, badge de agente asignado, selector de categoría, lista/input de tags + dropdown.

**Props:**
```ts
{ draft, availableTags, onFieldChange, onUnassignAgent, embedded }
```

**Pasos:**
1. Nuevo `components/item-header.tsx`.
2. Mover JSX del bloque `<header>` actual (líneas ~308–438).
3. Mover `handleAddTag`, `handleRemoveTag` y el state local de `tagInput` / `showTagDropdown` aquí.

---

### 2.3 Extraer `ItemToolbar` e `ItemEditor`

- `components/item-toolbar.tsx`: toggle Rendered/Raw, History, Add Skill, Assign Agent, Use Template, Copy raw, error inline.
- `components/item-editor.tsx`: Tiptap + textarea raw + `EditorContent`. Encapsula `useEditor`, `handlePaste`, `setMarkdown`.

**Pasos:**
1. Crear ambos archivos.
2. Mover JSX correspondiente (líneas ~441–582).
3. `ItemEditor` recibe `value`, `mode`, `onChange`, `onModeChange` y oculta los detalles de Tiptap al padre.

---

### 2.4 Mejorar `isContentDirty`

**Problema:** usa `JSON.stringify` para tags y appliedSkills, sensible al orden.

**Pasos:**
1. Helper `lib/equality.ts`:
   - `arraysEqualUnordered<T>(a: T[], b: T[], key?: (t: T) => string): boolean`.
2. `isContentDirty` compara:
   - Strings con `===`.
   - `tags` con `arraysEqualUnordered`.
   - `appliedSkills` con `arraysEqualUnordered(..., s => s.id)`.
3. Memoizar el cálculo con `useMemo` dentro de `useItemDraft`.

---

### 2.5 Reemplazar el race del dropdown de tags

**Problema:** `onBlur` + `setTimeout(200)` puede perderse clicks o cerrarse antes de tiempo.

**Pasos:**
1. En `ItemHeader`, hook `useClickOutside(ref, onClose)` (~10 líneas).
2. Ref sobre el contenedor del input + dropdown.
3. Eliminar `onBlur` + `setTimeout`.
4. Alternativa más simple: `onMouseDown` (no `onClick`) en los items del dropdown — dispara antes del blur del input.

---

**Archivos tocados:** `components/item-view.tsx`, `components/item-header.tsx` (nuevo), `components/item-toolbar.tsx` (nuevo), `components/item-editor.tsx` (nuevo), `lib/hooks/use-item-draft.ts` (nuevo), `lib/equality.ts` (nuevo).

**Riesgo:** medio. Cubrir con un Playwright smoke (crear → editar → guardar → cancelar → cambiar de modo) antes de empezar.

---

## Fase 3 — Modelo de estado agent/skill (🟡 decisión arquitectónica)

**Objetivo:** una sola fuente de verdad para skills aplicadas. Hoy hay dos (columna `applied_skills` + línea de prosa en `content`) y pueden desincronizarse si el usuario edita en raw.

### 3.1 Tomar la decisión

Dos opciones, una debe quedar registrada en `CLAUDE.md`:

- **Opción A: skills como agents** — fuente de verdad = `content`. Eliminar columna `applied_skills` (y `applied_skills_snapshot`). Detección por scan en cada render. **Pro:** simetría, menos estado. **Contra:** scan en cada render (cacheable con `useMemo`), perder skills si Turndown destruye la línea (poco probable, pero ver `lib/agent.ts` para precedente con `«»`).
- **Opción B: agents como skills** — añadir columna `assigned_agent text` a `items`. **Pro:** robusto a edición manual del usuario. **Contra:** migración, doble escritura en cada save, semántica de prosa "Actúa como…" se vuelve solo cosmética.

**Recomendación:** **Opción A**, porque ya se eligió ese modelo para agents y porque la prosa es lo que llega al LLM al copiar. La columna `applied_skills` es redundancia que se desincroniza.

### 3.2 Implementar Opción A (si se confirma)

**Pasos:**
1. Migración: eliminar `items.applied_skills` y `versions.applied_skills_snapshot`.
2. `lib/skills.ts`: `scanSkills` ya devuelve names; añadir `scanSkillsWithIds(content, allSkillsCatalog)` que cruza nombres con el catálogo de items category=skill para recuperar IDs cuando se necesiten.
3. `lib/versioning.ts`: quitar `applied_skills` del UPDATE y del INSERT.
4. `app/actions.ts`: `saveItem` deja de aceptar `appliedSkills`.
5. `components/item-view.tsx` (post-Fase 2): `appliedSkills` deriva de `editedContent` con `useMemo`.
6. `HistoryDrawer`: `applied_skills_snapshot` deja de existir → derivar del `content_snapshot`.
7. Backfill no es necesario si el contenido ya tiene las líneas (verificar con SELECT antes de borrar la columna; si hay items con la columna poblada pero sin la línea, generar la línea en migración).

**Archivos tocados:** migración SQL, `lib/skills.ts`, `lib/versioning.ts`, `app/actions.ts`, `components/item-view.tsx`, `components/history-drawer.tsx`, `lib/database.types.ts`.

**Riesgo:** medio. Hacer en rama separada y validar con un dump del proyecto Supabase antes de mergear.

---

## Fase 4 — Pulido, tests y resiliencia (🟢)

**Objetivo:** higiene de código y red de seguridad contra regresiones.

### 4.1 Limpiezas rápidas

- [ ] `setSaveError("")` → `setSaveError(null)` en `item-view.tsx:236`. Buscar otras ocurrencias con grep `setSaveError\(""\)`.
- [ ] `hasVariables`: usar patrón sin flag `g` (constante separada) para `.test()` y evitar `new RegExp(...)` en cada llamada.
- [ ] `handlePaste`: o quitar el comentario engañoso, o branch sobre `event.shiftKey` para permitir paste con formato.
- [ ] Renombrar script `test:e2e` → `test:e2e:pytest` en `package.json`, o documentarlo en README.

### 4.2 Error boundary alrededor del editor

**Pasos:**
1. Componente `components/editor-error-boundary.tsx` (class component, captura `componentDidCatch`).
2. Fallback UI: mensaje + botón "Cambiar a modo raw" + botón "Recargar".
3. Envolver `<ItemEditor>` (o el bloque `<main>` en `item-view.tsx` pre-Fase 2).

### 4.3 Tests unitarios faltantes

Crear:
- `lib/__tests__/variables.test.ts`:
  - `hasVariables` true/false.
  - `extractVariables` deduplica y preserva orden.
  - Patrones inválidos (`{{123}}`, `{{ }}`, `{{a-b}}`) no matchean.
  - `replaceVariables` solo sustituye claves presentes en values.
- `lib/__tests__/agent.test.ts`:
  - `extractAgent` con/sin línea inicial.
  - `applyAgent` reemplaza correctamente un agente existente.
  - `removeAgent` deja el resto intacto.
  - Round-trip: `applyAgent` → `markdownToHtml` → `htmlToMarkdown` → `extractAgent` recupera el nombre original (tras `normalizeAgentTitle`).
- `lib/__tests__/markdown.test.ts` (ver Fase 1.2): chips fuera de code blocks.

### 4.4 Memoización del round-trip markdown (opcional)

Solo si se observa lag con prompts >5k caracteres:
- Debounce `htmlToMarkdown` con `requestIdleCallback` o `useDeferredValue` en `onUpdate`.

**Archivos tocados:** `components/item-view.tsx`, `components/editor-error-boundary.tsx` (nuevo), `lib/variables.ts`, `package.json`, varios tests nuevos.

---

## Fase 5 — Marcador de deuda v2 (📌 5 min)

**Objetivo:** dejar trazabilidad para que la deuda de auth no se olvide.

**Pasos:**
1. Añadir comentario al inicio de `app/actions.ts`:
   ```ts
   // TODO(v2-auth): when NEXT_PUBLIC_AUTH_ENABLED flips to true, remove the
   // `ownerId` parameter from every server action and derive owner from the
   // session (createServerClient + auth.getUser()). Admin client bypasses RLS,
   // so an authenticated caller could otherwise read another user's data.
   ```
2. Añadir línea en `CLAUDE.md` § Auth → v2:
   > Antes de activar el flag: refactorizar server actions para no aceptar `ownerId` del caller. Derivar de `auth.getUser()` en server y/o sustituir admin client por server client con scope de sesión.

**Archivos tocados:** `app/actions.ts`, `CLAUDE.md`.

---

## Orden de ejecución sugerido

```
Fase 5 (5 min, sin riesgo)
  ↓
Fase 1.1 (atomic save) → mergear, validar
  ↓
Fase 1.2 (variable chips) → mergear, validar
  ↓
Fase 4.1 + 4.3 (limpiezas y tests) → mergear
  ↓
Fase 2 (refactor ItemView) → rama larga, mergear con cuidado
  ↓
Fase 4.2 (error boundary) → ahora que hay componentes separados
  ↓
Fase 3 (modelo agent/skill) → decisión + migración
  ↓
Fase 4.4 (memoización, solo si hace falta)
```

## Criterios de aceptación globales

- [ ] `npm run lint` sin warnings nuevos.
- [ ] `node --test lib/__tests__/*.test.ts` pasa (cobertura mínima en `variables`, `agent`, `skills`, `markdown`).
- [ ] `npm run test:visual` pasa (sin nuevas diferencias visuales).
- [ ] Smoke manual: crear item → añadir variables → añadir skill → asignar agent → guardar → ver versión en historial → restaurar → confirmar contenido.
- [ ] `git grep -n "JSON.stringify"` en `components/` y `lib/` no muestra comparaciones de igualdad.
- [ ] `git grep -n "applied_skills"` solo en migraciones históricas (post-Fase 3).
