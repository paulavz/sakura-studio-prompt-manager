# Plan de Correcciones v4 — Sakura Prompt Studio

> Plan derivado del cuarto code review. Recoge los pendientes de v3 que aún
> no se aplicaron, más una observación sobre el rollback del fast-path en
> `equality.ts`. **Nada bloquea v1.** Total estimado: ~1h de trabajo.

---

## Skills del repo a consultar

Skills disponibles en `.agents/skills/` y cuáles aplican a este plan:

| Skill | Aplica a | Por qué |
|---|---|---|
| **`tiptap`** | Fase 1 | El cambio del sync toca `useEditor`, `onUpdate`, `editor.commands.setContent`, `editor.getHTML()`. Consultar `SKILL.md` antes de tocar la lógica para verificar que los patrones de ref + setContent con `emitUpdate: false` son los recomendados en la versión del editor que usamos. |
| **`vercel-react-best-practices`** | Fase 1, Fase 2 | Cubre patrones de `useRef` para valores transitorios (rule: `rerender-use-ref-transient-values`), deps de `useEffect` (`advanced-effect-event-deps`), cleanup de async en mount (`rerender-dependencies`), y evitar trabajo redundante en renders (`js-cache-function-results`). Revisar las reglas relevantes antes de aplicar. |
| **`webapp-testing`** | Validación post-Fase 1 | Para el smoke manual (tipeo rápido, mode switch, cancel/restore) escribir un script Playwright corto en lugar de hacerlo a mano repetidamente. |

**No aplican a este plan** (mencionados por descarte para que conste la decisión):
- `vercel-composition-patterns` — no hay refactor de composición de componentes.
- `tailwind-design-system` · `web-design-guidelines` — no hay cambios de UI.
- `supabase-postgres-best-practices` — no hay cambios en SQL ni RPCs.

---

## Resumen por fases

| Fase | Tema | Tamaño | Prioridad | Skills a consultar |
|---|---|---|---|---|
| 1 | Optimizar sync en `ItemEditor` | S | 🟡 alta | `tiptap`, `vercel-react-best-practices` |
| 2 | Race en mount de `useItemState` | XS | 🟢 baja | `vercel-react-best-practices` |
| 3 | Test para `equality.ts` (set-semantics) | XS | 🟢 baja | — |
| 4 | Decisión sobre fast-path revertido en `equality.ts` | XS | 🟢 info | — |

**Tamaños:** XS = <30 min · S = ~45 min

---

## Fase 1 — Optimizar sync en `ItemEditor` (🟡 alta)

**Objetivo:** eliminar el trabajo redundante en cada keystroke.

**Problema actual:**
- En modo rendered: `htmlToMarkdown` corre **dos veces** por tecla (una en `onUpdate`, otra en el sync effect para el guard `currentMd !== value`).
- En modo raw: el effect sigue parseando markdown → HTML y actualizando el editor invisible.

### Antes de empezar

1. Leer `.agents/skills/tiptap/SKILL.md` — sección de "Best Practices" sobre `editor.commands.setContent` y manejo de `emitUpdate`. Confirmar que el patrón ref + `lastEmittedRef` no rompe ninguna recomendación de la versión instalada (`@tiptap/react ^3.22.5`).
2. Leer las reglas relevantes de `.agents/skills/vercel-react-best-practices/rules/`:
   - `rerender-use-ref-transient-values.md` — patrón correcto para refs que no deben triggerar render.
   - `advanced-effect-event-deps.md` — cómo declarar deps de effect que dependen de funciones / refs.
   - `js-cache-function-results.md` — justificación de la cache vía ref.

### 1.1 Eliminar el doble `htmlToMarkdown`

**Archivo:** `components/item-editor.tsx`.

**Pasos:**

1. Añadir una ref para trackear el último valor emitido por la propia `ItemEditor`:
   ```ts
   const lastEmittedRef = useRef<string | null>(null);
   ```

2. En `onUpdate`, registrar lo emitido **antes** de propagar:
   ```ts
   onUpdate: ({ editor }) => {
     const md = htmlToMarkdown(editor.getHTML());
     lastEmittedRef.current = md;
     onChange(md);
     onClearError();
   },
   ```

3. En el sync effect, saltar cuando coincide:
   ```ts
   useEffect(() => {
     if (!editor) return;
     if (lastEmittedRef.current === value) return; // we emitted this — no sync needed
     editor.commands.setContent(markdownToHtml(value), { emitUpdate: false });
     lastEmittedRef.current = value;
   }, [value, editor]);
   ```

### 1.2 No sincronizar el editor en modo raw

**Mismo archivo.**

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

2. Al volver de raw → rendered, el effect dispara por el cambio de `mode` y sincroniza con el `value` actualizado.

### Validación

**Manual rápido:**
- Tipear rápido un párrafo largo en rendered → editor responsive, sin lag perceptible.
- Cambiar a raw → editar → volver a rendered → contenido sincronizado.
- Cancelar / restaurar versión → editor refleja el cambio.

**Con `webapp-testing` (recomendado):** escribir un script Playwright en `tests/` que automatice el flujo:
1. Lee `.agents/skills/webapp-testing/SKILL.md` — sección "Decision Tree" para elegir el approach.
2. Usa `scripts/with_server.py` (mencionado en el SKILL.md) para gestionar el dev server.
3. El script debe: abrir un item, tipear 50 caracteres, alternar modos 3 veces, cancelar, restaurar, y verificar contenido. Si quiere, instrumenta `htmlToMarkdown` con un `console.count` temporal y assertar el conteo desde Playwright.

### Archivos tocados
- `components/item-editor.tsx`.
- Opcional: `tests/<nombre>.py` (script Playwright nuevo).

### Criterio de aceptación
- Una sesión de 50 keystrokes en modo rendered → `htmlToMarkdown` debe ejecutarse ~50 veces (antes ~100). Verificable con un `console.count` temporal o un breakpoint.
- Smoke manual o automatizado del flujo cancel → restore → mode switch sin pérdida de contenido.

---

## Fase 2 — Race en mount de `useItemState` (🟢 baja)

**Objetivo:** evitar setState sobre componentes desmontados.

**Archivo:** `hooks/use-item-state.ts:102-105`.

### Antes de empezar

Leer de `vercel-react-best-practices/rules/`:
- `async-defer-await.md` — patrones para diferir resolución de promises tras unmount.
- `client-swr-dedup.md` — si en el futuro se considera mover estos fetches a SWR (no es el alcance ahora).

### Pasos

1. Cambiar el effect a:
   ```ts
   useEffect(() => {
     let cancelled = false;
     getTags().then((data) => { if (!cancelled) setAvailableTags(data); });
     getItemVersions(item.id).then((data) => { if (!cancelled) setVersions(data); });
     return () => { cancelled = true; };
   }, [item.id]);
   ```

### Archivos tocados
- `hooks/use-item-state.ts`.

### Criterio de aceptación
- Sin warnings `"Can't perform a React state update on an unmounted component"` en la consola al navegar rápido entre items.

---

## Fase 3 — Test para `equality.ts` (🟢 baja)

**Objetivo:** codificar el contrato "set-semantics" recién documentado para que un futuro refactor no lo rompa silenciosamente.

**Archivo nuevo:** `lib/__tests__/equality.test.ts`.

**No requiere skill específica** — son tests unitarios con `node:test`, sin DOM ni red.

**Contenido:**

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

  it("treats arrays as sets (duplicates collapse) — documented behavior", () => {
    // Per docblock: [1,1,2] and [1,2,2] both reduce to set {1,2} → equal
    assert.strictEqual(arraysEqualUnordered([1, 1, 2], [1, 2, 2]), true);
  });
});

describe("arraysEqualUnordered (objects with key)", () => {
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

  it("ignores non-key fields", () => {
    const a = [{ id: "x", name: "Foo" }];
    const b = [{ id: "x", name: "Bar" }];
    assert.strictEqual(arraysEqualUnordered(a, b, (o) => o.id), true);
  });
});
```

### Archivos tocados
- `lib/__tests__/equality.test.ts` (nuevo).

### Criterio de aceptación
- `node --test lib/__tests__/equality.test.ts` pasa.
- Forma parte de la suite `node --test lib/__tests__/*.test.ts`.

---

## Fase 4 — Decisión sobre el fast-path revertido en `equality.ts` (🟢 info)

**Objetivo:** decidir conscientemente si el rollback del fast-path para primitivos fue intencional.

**Estado:** la rama añadida por PLAN-FIXES-V2 § Fase 4.5 (Set nativo en lugar de `JSON.stringify`) ya no existe. Hoy se ejecuta `JSON.stringify("foo")` por cada elemento de strings.

**Impacto:** funcionalmente equivalente. Para `tags` (5–20 items típicos), la diferencia de perf es invisible.

**Decisión a tomar:**

- **A. Aceptar el rollback** — implementación más uniforme, una sola rama de código, perf irrelevante a esta escala. **Acción:** ninguna.
- **B. Restaurar el fast-path** — micro-optimización innecesaria pero "correcta". **Acción:** reintroducir la rama `if (!key)` con `Set<T>` directo.

**Recomendación:** **A**. La rama actual es más simple y la diferencia de perf no se nota en este uso. Si en el futuro un caso real lo pide, se reintroduce.

### Archivos tocados
- Ninguno si se elige A.

---

## Orden de ejecución sugerido

```
Antes de Fase 1: leer .agents/skills/tiptap/SKILL.md y reglas relevantes
de vercel-react-best-practices
  ↓
Fase 1 (alta — único cambio con retorno visible)
  ↓
Validación con webapp-testing (script Playwright) — opcional pero recomendado
  ↓
[opcional, cuando convenga — un cleanup PR]
Fase 2 + Fase 3 + Fase 4 (agrupadas)
```

## Criterios de aceptación globales

- [ ] `npm run lint` sin warnings nuevos.
- [ ] `node --test lib/__tests__/*.test.ts` pasa (incluyendo el nuevo `equality.test.ts`).
- [ ] `npm run test:visual` pasa.
- [ ] Smoke manual o Playwright: tipear rápido en rendered → sin lag. Cambiar de modo varias veces → contenido preservado. Cancelar / restaurar → editor sincronizado.
- [ ] Sin warnings de "state update on unmounted component" durante navegación rápida entre items.

---

## Lo que NO está en este plan (deuda diferida)

- **Unificar fuente de verdad agent/skill** — `TODO(skill-unify)` ya marcado en `lib/skills.ts`, `app/actions.ts`, `CLAUDE.md`. Próxima iteración mayor.
- **Refactor multi-user / quitar `ownerId`** — `TODO(v2-auth)` marcado. Solo aplica al activar auth.
- **`useCallback` en handlers del hook** — preventivo sin caso de uso real. Diferir.
- **Tests para `useClickOutside`** — requeriría añadir testing-library. No compensa para un hook de 22 líneas validado por smoke.

---

## Resumen

**Fase 1 es la única con valor visible.** Las demás son higiene opcional. Antes de tocar `item-editor.tsx`, leer los SKILL.md de `tiptap` y las reglas de `vercel-react-best-practices` listadas — el cambio es pequeño pero toca lógica delicada del editor.
