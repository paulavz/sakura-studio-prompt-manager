# Rediseño Sakura — Índice de Fases 10 → 19

> **Origen:** decisiones tomadas en `phases/fase-9.1/` (PIXEL_PERFECT_PLAN, DESIGN_GAPS_QUESTIONS, CLAUDE_DESIGN_PROMPT).
> **Objetivo global:** llevar la app a pixel-perfect contra el mockup extendido (incluye superficies nuevas: edit mode, save bar, history drawer, agente chip, skills strip, settings, variables drawer refinado).

---

## Convenciones comunes a todas las fases

- **Fuente de la verdad de tamaño:** 1920×1080 nativo, escalado 100%, dpr 1.
- **Una fase = un commit** (excepto fases de test, que pueden ser uno o varios commits para regenerar baselines).
- **Cada fase tiene su `PLAN.md`** con Objetivo, Prerequisites, Scope, Out of scope, Tareas, Skills, Riesgos, Definition of done.
- **Las fases de test** (12, 16, 19) son **stop-gates**: si rojo, se detiene la cadena y se abre mini-fase de fix.
- **Skills disponibles** (`.agents/skills/`): `tiptap`, `tailwind-design-system`, `webapp-testing`, `supabase-postgres-best-practices`, `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`. Cada plan declara cuáles aplica.
- **Block until mockup**: cada fase indica qué mockups del `CLAUDE_DESIGN_PROMPT.md` necesita. Si faltan, se implementa con tokens y comportamiento; el refinamiento pixel-perfect ocurre en la fase de test correspondiente o en una pasada final (Fase 19).

---

## Cadena de fases

| Fase | Carpeta | Tipo | Cubre | Bloque CLAUDE_DESIGN_PROMPT | Test gate |
|---|---|---|---|---|---|
| 10 | `phases/fase-10/` | Implementación | ⚠️ Edit mode unificado (REVERTIDO en 12.5) | §1 | — |
| 11 | `phases/fase-11/` | Implementación | Save / Cancel bar inferior | §2 | — |
| **12** | `phases/fase-12/` | **TEST** | Visual + E2E + smoke del viewer (10+11) — parcialmente obsoleta | — | ✅ stop-gate |
| **12.5** | `phases/fase-12.5/` | **Rollback + retest** | Eliminar botón ✎ Edit, volver a edición inline siempre visible. Actualizar tests E2E afectados. | §1 (revisado) | ✅ mini-gate |
| 13 | `phases/fase-13/` | Implementación | History drawer lateral | §3 | — |
| 14 | `phases/fase-14/` | Implementación | Chip `by @agent` + Assign Agent diferenciado | §4 | — |
| 15 | `phases/fase-15/` | Implementación | Skills dropdown + strip inline | §5 | — |
| **16** | `phases/fase-16/` | **TEST** | Visual + E2E + unit (13+14+15) | — | ✅ stop-gate |
| 17 | `phases/fase-17/` | Implementación | Settings page + Tags CRUD con regla de huérfanas | §6 | — |
| 18 | `phases/fase-18/` | Implementación | Variables Drawer (mantener v1) + contador `N/MAX` + petal rain | §7 (revisado) | — |
| **19** | `phases/fase-19/` | **TEST FINAL** | Visual global + E2E completo + smoke + lado-a-lado contra mockup | — | ✅ stop-gate final |

> §8 (Animaciones) **no requiere fase propia**: petal rain ya existe (se reusa en Fases 11 y 18), hover glow ya implementado, decisión de no respetar `prefers-reduced-motion` se documenta en `CLAUDE.md` al cierre de Fase 19.

---

## Dependencias entre fases

```
10 ──► 11 ──► [12 TEST] ──► [12.5 ROLLBACK] ──► 13 ──► 14 ──► 15 ──► [16 TEST] ──► 17 ──► 18 ──► [19 TEST FINAL]
                                                  ▲                                              ▲
                                                  │ (Fases 13-15 son independientes;              │ (cierre del rediseño)
                                                  │  pueden paralelizarse si hay equipo)          │
```

- **Fase 10 → 11:** dependencia dura (save bar usa `isContentDirty` de la 10).
- **Fase 12.5:** rollback obligatorio antes de continuar a Fase 13. Elimina el botón `✎ Edit` introducido en Fase 10 y vuelve al modelo "siempre editable" (decisión post-Fase 12).
- **Fases 13, 14, 15:** independientes entre sí. Si trabajas sola, hacer en orden listado. Si paralelizas, puede ser cualquier orden. Ya no referencian `isEditing` (no se ven afectadas por el rollback de 12.5).
- **Fase 17 → 18:** débil. Fase 17 crea el placeholder de `/settings/variables`; Fase 18 lo materializa. Pueden hacerse en paralelo si se coordina el routing.

## Estimaciones

| Bloque | Esfuerzo aprox. |
|---|---|
| Fases 10 + 11 + 12 | 2 sesiones cortas + 1 sesión test (✅ hecho) |
| Fase 12.5 | 1 sesión muy corta (rollback + retest E2E afectado) |
| Fases 13 + 14 + 15 + 16 | 3 sesiones cortas + 1 sesión test |
| Fases 17 + 18 + 19 | 1 sesión normal + 1 sesión corta + 1 sesión test+smoke |
| **Total restante** | 12.5 + 13–19 = ~5 sesiones de implementación + 2 de test |

## Si los mockups de Claude Design tardan

Cada plan de implementación está diseñado para arrancar **con tokens y decisiones de comportamiento ya definidas en `fase-9.1/CLAUDE_DESIGN_PROMPT.md`**. Sin los HTMLs nuevos no se bloquea ninguna fase; el refinamiento final pixel-perfect (cuando lleguen los mockups) se hace en la Fase 19 o en una mini-fase 19.5 de polish.

## Cierre del rediseño

> **Estado:** Cerrado 2026-05-13 vía `phases/cierre-rediseno/`.
> **Commits del cierre:**
> - `3bfd6aa` chore: ignore phase mockup sources in eslint
> - `2c19f0d` fix(react-hooks): hoist setState out of effects
> - `195201a` chore(tests): drop unused visual helpers imports
> - `7af9f16` feat(viewer): inline agent chip with green tokens + confirm dialog on replace
> - `6d4abbe` test(e2e): adjust agent badge assertions for inline chip
> - `45a8c8a` feat(viewer): sakura skills strip with inline × remove
> - `5cd587e` test(visual): seed sidebar test + relax threshold for category count flakiness
> - `33bdd59` feat(settings): add /settings/variables page with env defaults
> - `6a0c6fc` feat(drawer): N/MAX counter under variable inputs

## Próximos pasos sugeridos

1. **Revisar este índice y los 7 PLAN.md** antes de arrancar Fase 10. Pedir cambios si algún scope o prerequisito no convence.
2. Cuando se arranque una fase, abrir el `PLAN.md` correspondiente y marcar tareas como `[x]` a medida que se completan.
3. Entre fases de test (12, 16, 19), respetar el stop-gate: no avanzar si hay rojo sin mini-fase de fix.
4. Mantener el `phases/fase-9.1/CLAUDE_DESIGN_PROMPT.md` como única fuente de decisiones; si alguna decisión cambia durante implementación, actualizar ese doc y los PLAN.md afectados.
