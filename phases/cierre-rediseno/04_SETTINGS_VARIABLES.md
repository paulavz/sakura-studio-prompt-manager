# 04 — Cierre Fase 17: sub-sección `/settings/variables`

> **Bloque cubierto:** §6 de `phases/fase-9.1/CLAUDE_DESIGN_PROMPT.md` (sección "Variables Drawer" en Settings).
> **Estimación:** ~1 commit, sesión muy corta.

## Gap detectado en code review

`app/settings/` tiene `layout.tsx` y `tags/page.tsx` pero **no existe `app/settings/variables/page.tsx`**. La spec de Fase 17 pedía dos sub-secciones en la sub-nav lateral del settings:

1. **Tags** ✅ implementada.
2. **Variables Drawer** — defaults globales `MIN_VAR_LENGTH` / `MAX_VAR_LENGTH` (ver CLAUDE.md §"Variables de entorno"). ❌ falta.

## Scope

- Crear `app/settings/variables/page.tsx` con vista **readonly** que muestra los valores actuales de `MIN_VAR_LENGTH` y `MAX_VAR_LENGTH` (leídos del entorno via `lib/env.ts`).
- Añadir el item "Variables" a la sub-nav del `app/settings/layout.tsx` (sidebar interna).
- Estilo coherente con la página Tags (mismas paddings, mismo header pattern).
- **Readonly por ahora:** solo display de los valores. La edición vía UI queda para una v2 (los defaults se cambian en `.env.local`).
- Hint claro: `These defaults are configured via environment variables. Edit .env.local to change.`

## Out of scope

- Edición real de `MIN/MAX` desde la UI (requiere persistencia o reload de proceso, fuera de scope para v1).
- Sliders interactivos del mockup #17 (no priorizado, basta con inputs disabled o `<dl>` readonly).
- Otras secciones (Apariencia, Atajos, Export/Import).

## Tareas

- ⬛ T04.1. En `lib/env.ts`: exportar getters `getMinVarLength()` y `getMaxVarLength()` que leen `process.env.MIN_VAR_LENGTH` / `MAX_VAR_LENGTH` con defaults (1 / 4000). Si ya existen, reusarlos.
- ⬛ T04.2. Crear `app/settings/variables/page.tsx` (server component): renderiza header `Variables Drawer Defaults`, dos filas readonly:
  - `Minimum length`: valor + label `MIN_VAR_LENGTH`.
  - `Maximum length`: valor + label `MAX_VAR_LENGTH`.
  - Hint en gris: `These defaults are configured via environment variables. Edit .env.local to change.`
- ⬛ T04.3. En `app/settings/layout.tsx`: añadir entry `Variables` al sidebar interno (después de `Tags`). Marcar activo cuando `pathname === "/settings/variables"`.
- ⬛ T04.4. Smoke manual: navegar a `/settings`, click en "Variables", verificar que se ve y refleja los valores reales del `.env.local` o defaults.

## Skills a utilizar

- **`vercel-react-best-practices`** — server components vs client en App Router (la sub-nav probablemente necesita `"use client"` para `usePathname`).
- **`tailwind-design-system`** — reusar paddings/tipografía de `tags/page.tsx`.

## Riesgos

- `process.env.MIN_VAR_LENGTH` solo está disponible server-side. Por eso la página debe ser server component (no `"use client"`).
- Si la sub-nav está hardcodeada en el layout actual, hay que extender la lista en lugar de duplicar el componente.

## Definition of done

- [ ] `app/settings/variables/page.tsx` existe y renderiza los defaults.
- [ ] Sub-nav del settings muestra "Variables" como segundo item.
- [ ] Click en "Variables" navega correctamente (URL `/settings/variables`).
- [ ] Hint sobre `.env.local` visible.
- [ ] `npm run lint && npm run typecheck` limpios.
- [ ] Test E2E `tests/e2e/settings-navigation.spec.ts` actualizado para verificar la nueva entry (puede ser un caso simple de "click + url cambia").
