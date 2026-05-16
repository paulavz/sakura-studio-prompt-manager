# Cierre del rediseño — Índice

> **Origen:** code review post-Fase 9.1 (2026-05-12). Detectó que las Fases 14, 15, 17 y 18 quedaron implementadas **parcialmente** y la Fase 19 nunca se ejecutó.
> **Objetivo:** cerrar todos los gaps con mini-fases pequeñas y atómicas, regenerar baselines, y dejar la rama lista para merge.
> **Regla:** **una mini-fase = un commit**. Después de meses sin commitear (último: `499f39b mejora fase 9.1`), hay que recuperar trazabilidad.

---

## Estado real verificado en código (2026-05-12)

| Fase original | Componente | Estado real | Gap |
|---|---|---|---|
| 11 | `components/save-bar.tsx` | ✅ completo | — |
| 12.5 | `item-view.tsx` (sin `isEditing`) | ✅ completo | — |
| 13 | `components/history-drawer.tsx` | ✅ completo | — |
| 14 | `components/agent-selector.tsx` + badge | ⚠️ parcial | Chip visual incorrecto + sin confirm de reemplazo |
| 15 | `components/skill-selector.tsx` + panel | ⚠️ parcial | Strip gris sin `×`, sin `removeSkillFromContent` |
| 17 | `app/settings/{layout,tags}` | ⚠️ parcial | Falta sub-sección `/settings/variables` |
| 18 | `components/variable-drawer.tsx` | ⚠️ parcial | Falta contador `N/MAX` por input |
| 19 | — | ❌ no ejecutada | Sin baselines globales ni side-by-side |

Además: **24 errores de lint** (mayoría en `phases/phase-9/_mockup-source/*.jsx` mockup-only, pero hay 5 en app code) y **trabajo sin commit** desde Fase 9.1.

---

## Cadena de mini-fases

```
[01 PRE-FIX code review] ──► 02 ──► 03 ──► 04 ──► 05 ──► [06 FASE 19 FINAL]
                              ▲      ▲      ▲      ▲
                              │ (02-05 son independientes; pueden hacerse en cualquier orden)
```

| # | Archivo | Tipo | Cubre | Commit objetivo |
|---|---|---|---|---|
| 01 | `01_PRE_CODE_REVIEW_FIX.md` | Pre-requisito | Lint app code + excluir mockup source + commitear estado actual por fase | `chore: lint cleanup + recover phase commits` |
| 02 | `02_FIX_AGENT_CHIP.md` | Implementación | Mover chip a inline-toolbar verde + confirm de reemplazo (Fase 14 cierre) | `feat(viewer): inline green agent chip + replace confirm` |
| 03 | `03_FIX_SKILLS_STRIP.md` | Implementación | Strip sakura con `×` que borra del content + `removeSkillFromContent` (Fase 15 cierre) | `feat(viewer): inline skills strip with auto-remove` |
| 04 | `04_SETTINGS_VARIABLES.md` | Implementación | `/settings/variables` con defaults `MIN/MAX` readonly (Fase 17 cierre) | `feat(settings): variables defaults sub-section` |
| 05 | `05_VAR_DRAWER_COUNTER.md` | Implementación | Contador `{N}/{MAX}` bajo cada input del Variables Drawer (Fase 18 cierre) | `feat(drawer): N/MAX counter under variable inputs` |
| 06 | `06_FASE_19_FINAL.md` | TEST FINAL | Regeneración global de baselines + smoke + side-by-side vs mockup | `test: full visual + e2e regression` |

---

## Dependencias

- **01 es bloqueante:** sin ese commit limpio, los siguientes commits arrastran 5 errores de lint y mezclan trabajo de fases anteriores no commiteado.
- **02, 03, 04, 05 son independientes entre sí:** tocan zonas distintas (toolbar viewer / strip viewer / settings page / drawer). Si trabajas sola, hacer en orden listado. Si paralelizas (sesiones distintas), cualquier orden vale.
- **06 es stop-gate final:** no cerrar el rediseño sin pasar todas sus suites verdes.

## Estimación

| Bloque | Esfuerzo aprox. |
|---|---|
| 01 (pre-fix + commits) | 1 sesión corta |
| 02 + 03 + 04 + 05 | 1 sesión normal (los cuatro son cambios pequeños) |
| 06 (test final) | 1 sesión normal (regenerar baselines + smoke) |
| **Total** | ~3 sesiones |

## Convenciones (heredadas del REDESIGN_INDEX)

- Fuente de la verdad: 1920×1080 nativo, dpr 1.
- Tokens en `tailwind.config.ts` / `app/globals.css`. Prohibido hardcodear hex.
- Mensajes/comentarios/commits en inglés (CLAUDE.md §"Language rule").
- Cada mini-fase indica **skills** del `.agents/skills/` que aplica.

## Pass criteria global del cierre

- [ ] `npm run lint` limpio en app code (excluir `phases/phase-9/_mockup-source/`).
- [ ] `npm run typecheck` limpio.
- [ ] `npx playwright test` verde (visual + e2e).
- [ ] Smoke manual a 1920×1080: usuaria confirma "se ve y se siente bien".
- [ ] `git log --oneline` muestra commits separados por mini-fase (no un mega-commit).
- [ ] `phases/REDESIGN_INDEX.md` actualizado con nota de cierre apuntando a esta carpeta.
