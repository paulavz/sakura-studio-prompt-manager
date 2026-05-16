# 06 — TEST FINAL del rediseño (sustituye Fase 19)

> **Tipo:** stop-gate final. **Sin código de producto.**
> **Estimación:** 1 sesión normal (~1.5-2 h, depende de cuántas baselines fallen).

## Objetivo

Validar que el rediseño completo (Fases 10-18 + cierres 02-05) está pixel-perfect contra el mockup `design/Sakura Prompt Studio - Phase 9.1 _standalone_.html` y que no hay regresiones funcionales.

## Suites a ejecutar

### Visual (Playwright)

- ⬛ V06.1. **Regenerar baselines** de **todas** las specs en `tests/visual/`:
  - `sidebar.spec.ts`
  - `gallery-cards.spec.ts`
  - `tag-chips.spec.ts`
  - `variable-chips.spec.ts`
  - `viewer.spec.ts`
  - `three-pane-layout.spec.ts`
  - Comando: `npx playwright test tests/visual --update-snapshots`.
  - **Antes** de aceptar cada nueva baseline, abrir el `.png` y comparar contra el mockup HTML standalone a 1920×1080. Si hay drift visible no documentado → abrir issue, no aceptar baseline.

- ⬛ V06.2. **Snapshots nuevos a añadir** (post cierres 02-05):
  - `agent-chip-inline.png` — viewer con chip `by @agent` inline en toolbar (cierre 02).
  - `skills-strip-sakura.png` — viewer con strip sakura de 3 skills + botones `×` (cierre 03).
  - `settings-variables.png` — `/settings/variables` con defaults readonly (cierre 04).
  - `variable-drawer-with-counter.png` — drawer abierto con contador `N/MAX` visible (cierre 05).

- ⬛ V06.3. **Side-by-side vs mockup** (manual):
  - Abrir `design/Sakura Prompt Studio - Phase 9.1 _standalone_.html` en una ventana al 50%.
  - Abrir la app `npm run dev` en otra ventana al 50%.
  - Recorrer pantalla por pantalla: sidebar, gallery, viewer (lectura/edit/dirty), drawer, history, agent chip, skills strip, settings tags, settings variables.
  - Documentar drift restante en `phases/cierre-rediseno/FINAL_DRIFT_REPORT.md` (uno por surface). Si el drift es ≤ 2 px / 1 token → aceptado y documentado. Si es mayor → abrir mini-fase 06.5 de polish.

### E2E behavioral (Playwright)

- ⬛ E06.1. Ejecutar **toda** la suite `tests/e2e/`:
  - `viewer-edit-mode.spec.ts` (post 12.5: ya no debe haber referencias a `✎ Edit`).
  - `viewer-history-agent-skills.spec.ts` (post 02 + 03: selectores actualizados).
  - `settings-navigation.spec.ts` (post 04: nueva entry "Variables" verificada).
- ⬛ E06.2. Si alguna spec falla por selector obsoleto, **arreglar el test, no la app** — la app está validada por las visuales.

### Smoke manual

- ⬛ S06.1. Levantar `npm run dev`, abrir 1920×1080 nativo, recorrer flujos críticos:
  1. Crear item nuevo → editar inline → save → petal rain → save bar desaparece.
  2. Asignar agente → reasignar otro → confirm dialog → reemplazo correcto.
  3. Añadir skill → ver chip sakura en strip → click `×` → save bar aparece → save → strip vacío.
  4. Abrir history drawer → restore versión → confirm → contenido actualizado.
  5. Abrir Use Template → llenar variables → ver contador `N/MAX` → Copy Result → petal rain.
  6. Ir a `/settings/tags` → crear tag → eliminar tag huérfana (confirm).
  7. Ir a `/settings/variables` → ver defaults readonly.
  8. Cambiar entre Render/Raw mientras dirty → toggle bloqueado.
  9. Pegar HTML rico → verificar texto plano. `Ctrl+Shift+V` → con formato.

### Lint + typecheck

- ⬛ L06.1. `npm run lint` 0 errors.
- ⬛ L06.2. `npm run typecheck` limpio.

## Pass criteria

- [ ] Todas las baselines visuales aceptadas y commiteadas.
- [ ] Toda la suite `tests/e2e/` verde en Chromium.
- [ ] `FINAL_DRIFT_REPORT.md` escrito con drift restante documentado (o "Sin drift" si aplica).
- [ ] Smoke manual: usuaria confirma "se ve y se siente bien" a 1920×1080.
- [ ] `git log --oneline` muestra todos los commits del cierre y un commit final `test: full visual + e2e regression`.
- [ ] `phases/REDESIGN_INDEX.md` actualizado con nota: "Cerrado 2026-MM-DD vía `phases/cierre-rediseno/`. Estado: producción".

## Acción si rojo

Si una suite falla y el drift no es aceptable:
- **Visual:** abrir mini-fase 06.5 de polish con el surface afectado. NO degradar baselines silenciosamente.
- **E2E:** decidir si es bug de app (mini-fase de fix) o test obsoleto (arreglar test). Documentar en `FINAL_DRIFT_REPORT.md`.

## Skills a utilizar

- **`webapp-testing`** — Playwright snapshot regeneration, helpers existentes (`tests/visual/helpers/*`).

## Notas

- Si el side-by-side revela que el mockup standalone tiene bugs propios (tabs blank, etc., reportados en code review previo), comparar contra el HTML que sí carga. **Nunca** modificar la app para cuadrar con un mockup roto.
