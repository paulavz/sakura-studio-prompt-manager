# 01 — Pre-fix: code review + recuperar trazabilidad git

> **Tipo:** pre-requisito. Sin esto, los siguientes commits arrastran ruido.
> **Estimación:** 1 sesión corta (~30-45 min).

## Objetivo

1. Resolver los errores de lint reales en app code (5 ocurrencias de `react-hooks/set-state-in-effect`).
2. Excluir el mockup source (`phases/phase-9/_mockup-source/*.jsx`) del lint — son fuentes de referencia, no app code.
3. **Recuperar trazabilidad git:** todo el trabajo de Fases 10→18 está sin commit. Hacer commits separados por fase antes de seguir.

## Errores de lint reales en app code (verificados 2026-05-12)

| Archivo | Línea | Regla |
|---|---|---|
| `components/variable-drawer.tsx` | 85 | `react-hooks/set-state-in-effect` |
| `components/gallery.tsx` | 85 | `react-hooks/set-state-in-effect` |
| `components/agent-selector.tsx` | 44 | `react-hooks/set-state-in-effect` |
| `components/skill-selector.tsx` | 27 | `react-hooks/set-state-in-effect` |
| `app/settings/tags/page.tsx` | 47 | `react-hooks/set-state-in-effect` |

Patrón a aplicar (uno por uno, sin refactor profundo):
- Si el `setState` deriva de props/state ya disponibles → mover a `useMemo` o computar en render.
- Si depende de fetch async → envolver en función estable y guard con `if (cancelled) return;`.
- Si es un init de form a partir de prop → usar `key` o pasar a `useState` lazy initializer.

## Errores de lint en mockup source (excluir, no arreglar)

`phases/phase-9/_mockup-source/{app,markdown,petal-rain,tweaks-panel,variables-drawer}.jsx` — son la fuente de referencia visual de Phase 9, copiadas tal cual del export de Claude Design. **No son app code y no deben pasar por lint.**

Acción: añadir entrada al `.eslintignore` (o `ignores` en `eslint.config.js`):
```
phases/**
!phases/**/PLAN.md
```

## Warnings menores a barrer

- `tests/visual/{gallery-cards,sidebar}.spec.ts`: import `expectSpacingToken` no usado → eliminar.
- `tests/visual/three-pane-layout.spec.ts`: import `MOCKUP_VALUES` no usado → eliminar.

## Tareas

- ⬛ T01.1. Editar `eslint.config.js` (o `.eslintignore`) para excluir `phases/**`. Verificar que `npm run lint` deja de reportar los archivos `_mockup-source/*.jsx`.
- ⬛ T01.2. Arreglar las 5 ocurrencias de `react-hooks/set-state-in-effect` listadas arriba. Una por archivo, mínimo invasivo.
- ⬛ T01.3. Eliminar los 3 imports no usados en tests visuales.
- ⬛ T01.4. Verificar `npm run lint` y `npm run typecheck` limpios.
- ⬛ T01.5. **Commits de recuperación** (en este orden, antes de seguir con 02-06):
  1. `chore: ignore phase mockup sources in eslint`
  2. `fix(react-hooks): hoist setState out of effects`
  3. `chore(tests): drop unused visual helpers imports`
  4. (opcional, si vale la pena agrupar trabajo previo no commiteado): un commit por fase 10/11/12.5/13/14/15/17/18 con el subset de archivos correspondientes — usar `git add -p` para separar. Si es inviable separarlo limpiamente, hacer **un solo commit** `feat: phases 10-18 incremental implementation` y aceptar la pérdida de granularidad histórica.

## Skills a utilizar

- **`vercel-react-best-practices`** — patrones para hoist de setState fuera de effects.

## Riesgos

- Mover lógica de `useEffect` puede cambiar el momento del setState y disparar bugs sutiles. Tras cada fix, abrir el componente en dev y probar manualmente el flujo afectado (filtrar gallery, abrir agent-selector, abrir skill-selector, listar tags).
- Si el subset por fase no se separa limpio con `git add -p`, **no forzarlo**. Un commit "incremental" es preferible a 8 commits inventados.

## Definition of done

- [ ] `npm run lint` reporta 0 errors y ≤ 2 warnings (los hooks-deps menores quedan documentados).
- [ ] `npm run typecheck` limpio.
- [ ] `git status` sin archivos modified/untracked relevantes (excepto las baselines visuales nuevas, que se manejan en 06).
- [ ] `git log --oneline` muestra al menos los 3 commits de chore/fix de esta fase.
