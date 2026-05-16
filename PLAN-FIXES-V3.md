# Plan de Correcciones v3 — Sakura Prompt Studio

> Plan derivado del tercer code review. El proyecto está sustancialmente sano;
> este plan recoge las optimizaciones del editor, higiene de cleanup, y tests
> faltantes. **Nada bloquea v1** — se puede aplicar cuando te apetezca.

---

## Resumen por fases

| Fase | Tema | Tamaño | Prioridad | Riesgo |
|---|---|---|---|---|
| 1 | Optimizar sync en `ItemEditor` (double-parse + raw mode) | S | 🟡 media | bajo |
| 2 | Higiene de cleanup (timeouts + race en mount) | S | 🟢 baja | nulo |
| 3 | Semántica de `arraysEqualUnordered` + tests faltantes | S | 🟢 baja | nulo |
| 4 | `useCallback` en handlers del hook (opcional) | XS | 🟢 baja | nulo |

**Tamaños:** XS = <30 min · S = ~1 h

> **Recomendación de orden:** Fase 1 sola tiene el mayor retorno (perf en cada keystroke). El resto puede agruparse en un "cleanup PR" cuando convenga.

---

## Fase 1 — Optimizar sync en `ItemEditor` (🟡)

**Objetivo:** eliminar trabajo redundante en cada keystroke. Hoy `htmlToMarkdown` se ejecuta dos veces por tecla en modo rendered, y el sync también corre (innecesariamente) en modo raw.

### 1.1 Eliminar el doble `htmlToMarkdown`

**Archivo:** `components/item-editor.tsx`.

**Problema:** flujo actual en rendered mode con cada tecla:
1. `onUpdate` → `htmlToMarkdown(editor.getHTML())` ← ejecución 1
2. `value` prop cambia → useEffect → `htmlToMarkdown(editor.getHTML())` ← ejecución 2 (para el guard)

**Pasos:**

1. Añadir una ref que trackee el último valor que la propia `ItemEditor` produjo:
   ```ts
   const lastEmittedRef = useRef<string | null>(null);
   ```

2. En `onUpdate`, registrarla:
   ```ts
   onUpdate: ({ editor }) => {
     const md = htmlToMarkdown(editor.getHTML());
     lastEmittedRef.current = md;
     onChange(md);
     onClearError();
   },
   ```

3. En el sync effect, saltar cuando `value` coincide con lo que acabamos de emitir:
   ```ts
   useEffect(() => {
     if (!editor) return;
     if (lastEmittedRef.current === value) return; // we emitted this — no sync needed
     editor.commands.setContent(markdownToHtml(value), { emitUpdate: false });
     lastEmittedRef.current = value;
   }, [value, editor]);
   ```

**Beneficio:** `htmlToMarkdown` corre **una sola vez por keystroke**. El round-trip pesado solo ocurre cuando el valor cambia desde fuera (cancel, restore, skill/agent injection).

### 1.2 No sincronizar el editor en modo raw

**Archivo:** mismo.

**Problema:** en modo raw, cada keystroke del textarea cambia `value` → el effect parsea markdown → HTML y llama `setContent` sobre el editor oculto. Trabajo perdido.

**Pasos:**

1. Añadir `mode` a las deps del effect y guardar contra modo raw:
   ```ts
   useEffect(() => {
     if (!editor || mode !== "rendered") return;
     if (lastEmittedRef.current === value) return;
     editor.commands.setContent(markdownToHtml(value), { emitUpdate: false });
     lastEmittedRef.current = value;
   }, [value, editor, mode]);
   ```

2. Cuando el usuario vuelve a "rendered", el mismo effect dispara al detectar el cambio de `mode` y sincroniza con el valor actualizado del textarea.

**Beneficio:** modo raw es ahora textarea puro, sin overhead del editor invisible.

### Test manual sugerido

- Tipear rápido un párrafo largo en rendered → editor responsive, sin lag.
- Cambiar a raw → editar → volver a rendered → contenido sincronizado correctamente.
- Cancelar / restaurar versión → editor refleja el cambio.

### Archivos tocados
- `components/item-editor.tsx`.

### Criterios de aceptación
- En DevTools Performance, contar invocaciones de `htmlToMarkdown` en una sesión de 50 keystrokes en modo rendered → debe ser ≤50 (antes era ~100).
- Smoke manual del flujo cancel → restore → mode switch sin contenido perdido.

---

## Fase 2 — Higiene de cleanup (🟢)

**Objetivo:** evitar warnings de React por setState sobre componentes desmontados.

### 2.1 Limpiar `copiedTimeoutRef` en unmount

**Archivo:** `components/item-view.tsx:43-44`.

**Pasos:**

1. Añadir un effect de cleanup al final del componente (o donde corresponda):
   ```ts
   useEffect(() => {
     return () => {
       if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
     };
   }, []);
   ```

**Archivos tocados:** `components/item-view.tsx`.

---

### 2.2 Cancelar fetches en `useItemState` si el componente se desmonta

**Archivo:** `hooks/use-item-state.ts:102-105`.

**Problema:** `getTags()` y `getItemVersions()` no se cancelan si el componente se desmonta antes de resolver (caso no realista hoy por el `key={item.id}` en Gallery, pero defensivo).

**Pasos:**

1. Cambiar el effect a:
   ```ts
   useEffect(() => {
     let cancelled = false;
     getTags().then((data) => { if (!cancelled) setAvailableTags(data); });
     getItemVersions(item.id).then((data) => { if (!cancelled) setVersions(data); });
     return () => { cancelled = true; };
   }, [item.id]);
   ```

2. (Opcional, más limpio con AbortController si las acciones lo soportan — no aplica aquí porque son server actions que no aceptan signal.)

**Archivos tocados:** `hooks/use-item-state.ts`.

**Criterio:** ningún warning de React "Can't perform a React state update on an unmounted component" en consola durante navegación rápida entre items.

---

## Fase 3 — `arraysEqualUnordered` y tests faltantes (🟢)

**Objetivo:** aclarar la semántica del helper de igualdad y cubrir los módulos sin tests.

### 3.1 Renombrar / documentar `arraysEqualUnordered`

**Archivo:** `lib/equality.ts`.

**Problema:** semántica de conjuntos, no de arrays. `[1,1,2]` vs `[1,2,2]` devuelve `true`. Para `tags` (únicos por construcción) no importa, pero el nombre engaña.

**Pasos (elegir una):**

- **Opción A — renombrar:** `arraysEqualUnordered` → `setsEqualByValue` (con `key` opcional para objetos). Migrar los dos call sites en `use-item-state.ts:96-97`.
- **Opción B — documentar:** dejar el nombre pero añadir docblock explícito:
  ```ts
  /**
   * Compare two collections as SETS (ignoring duplicates).
   * For `[1,1,2]` vs `[1,2,2]` returns true because the underlying sets are equal.
   * If exact array equality including duplicates is needed, do not use this helper.
   */
  ```

**Recomendación:** Opción B. Renombrar fuerza touch en más sitios sin beneficio funcional.

**Archivos tocados:** `lib/equality.ts`.

---

### 3.2 Test para `lib/equality.ts`

**Pasos:**

1. Crear `lib/__tests__/equality.test.ts`:
   ```ts
   import { describe, it } from "node:test";
   import assert from "node:assert";
   import { arraysEqualUnordered } from "../equality";

   describe("arraysEqualUnordered (primitives)", () => {
     it("returns true for same elements in different order", () => {
       assert.strictEqual(arraysEqualUnordered(["a", "b"], ["b", "a"]), true);
     });
     it("returns false for different elements", () => {
       assert.strictEqual(arraysEqualUnordered(["a"], ["b"]), false);
     });
     it("returns false for different lengths", () => {
       assert.strictEqual(arraysEqualUnordered(["a"], ["a", "b"]), false);
     });
     it("treats arrays as sets (duplicates collapse)", () => {
       // Documented set-semantics — both reduce to {1, 2}
       assert.strictEqual(arraysEqualUnordered([1, 1, 2], [1, 2, 2]), true);
     });
   });

   describe("arraysEqualUnordered (with key)", () => {
     it("compares objects by extracted key", () => {
       const a = [{ id: "x" }, { id: "y" }];
       const b = [{ id: "y" }, { id: "x" }];
       assert.strictEqual(arraysEqualUnordered(a, b, (o) => o.id), true);
     });
     it("returns false when keys differ", () => {
       const a = [{ id: "x" }];
       const b = [{ id: "y" }];
       assert.strictEqual(arraysEqualUnordered(a, b, (o) => o.id), false);
     });
   });
   ```

**Archivos tocados:** `lib/__tests__/equality.test.ts` (nuevo).

---

### 3.3 Test ligero para `useClickOutside` (opcional)

Solo si se quiere coverage de hooks. Requiere `@testing-library/react`. Si no está instalado, **saltar** — coste de añadir testing-library por un hook trivial no compensa.

**Pasos (si se decide implementar):**

1. Instalar dev deps: `@testing-library/react`, `@testing-library/dom`, `jsdom`.
2. Configurar test runner para DOM env (node:test no soporta DOM nativo).
3. Test: render un div con la ref, montar, hacer click fuera, comprobar que `onOutside` se llamó.

**Recomendación:** saltar por ahora. El hook tiene 22 líneas y se valida implícitamente en el smoke manual del dropdown de tags.

**Archivos tocados:** ninguno si se salta; `package.json` + nuevo test si se implementa.

---

## Fase 4 — `useCallback` en handlers (XS, opcional)

**Objetivo:** estabilizar referencias de handlers retornados por `useItemState` para futuros consumidores que los pongan en deps.

**Estado actual:** ningún consumer lo necesita; `item-view.tsx` no usa los handlers en deps de effects. **No hay bug.** Esto es preventivo.

**Pasos (si se decide hacer):**

1. Envolver con `useCallback`:
   - `commitSave` (deps: `item.id` — el resto se pasa por parámetro)
   - `handleSave` (deps: `editedContent`, `title`, `category`, `tags`, `appliedSkills`, `isFavorite`)
   - `handleCancel` (deps: `committed`)
   - `handleAddTag`, `handleRemoveTag`, `handleAddSkill`, `handleRemoveSkill`, `handleAssignAgent`, `handleConfirmAgentReplace`, `handleUnassignAgent`, `handleRestoreVersion`, `handleToggleFavorite`

2. Verificar que no rompe nada (los handlers leen state actual; con useCallback + deps correctos, sigue funcionando).

**Recomendación:** **no hacer ahora**. Es ruido en el diff sin beneficio actual. Diferir hasta que un consumer real lo necesite.

**Archivos tocados:** `hooks/use-item-state.ts` (si se decide).

---

## Orden de ejecución sugerido

```
Fase 1 (sola — alto valor por línea cambiada) → mergear
  ↓
[opcional, cuando convenga]
Fase 2 + Fase 3.1 + Fase 3.2 (un cleanup PR agrupado) → mergear
  ↓
[opcional, solo si aparece un caso de uso]
Fase 3.3 + Fase 4
```

## Criterios de aceptación globales

- [ ] `npm run lint` sin warnings nuevos.
- [ ] `node --test lib/__tests__/*.test.ts` pasa (incluyendo `equality.test.ts` si se implementó Fase 3.2).
- [ ] `npm run test:visual` pasa.
- [ ] Smoke manual: tipear rápido en rendered → sin lag. Cambiar a raw → editar → volver a rendered → contenido preservado. Cambiar de item mientras "✓ Copied" está visible → sin warnings en consola.

## Lo que NO está en este plan (deuda diferida intencionalmente)

- **Unificar fuente de verdad agent/skill** — TODOs marcados en `lib/skills.ts`, `app/actions.ts`, `CLAUDE.md`. Próxima iteración mayor.
- **Refactor multi-user / quitar `ownerId` parameter** — TODO marcado. Solo aplica si activas auth.
- **Schema de `versions` para snapshot completo** — alternativa rechazada; el botón "Restore content" ya refleja la realidad.

---

## Resumen

**Lo único realmente útil de este plan es la Fase 1.** Las demás fases son higiene que se puede aplicar cuando convenga, o saltar sin coste real para v1.
