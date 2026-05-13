# 02 — Cierre Fase 14: chip `by @agent` inline + confirm de reemplazo

> **Bloque cubierto:** §4 de `phases/fase-9.1/CLAUDE_DESIGN_PROMPT.md`.
> **Estimación:** ~1 commit, sesión corta.

## Gap detectado en code review

`components/item-view.tsx:494-531` renderiza el badge de agente como **panel gris separado bajo el toolbar** (`bg-gray-50`, chip blanco con borde gris). La spec pide:

- Pill **inline al lado del título** del prompt en la toolbar (no panel debajo).
- Color **verde** derivado de la categoría `agente` (`bg-tag-green` `#F0F8E8`, border `gray-200`, font 11 px medium, prefijo `by` en `gray-500`, nombre del agente en `gray-800`).
- Si no hay agente: **el chip no se muestra** (no placeholder "Sin agente asignado", el espacio se cierra).

Además, el botón "Assign Agent" (`item-view.tsx:446-454`) es **gris genérico**; spec pide:
- Visualmente diferenciado de Add Skill: ícono `⌥` (o silueta de persona) + verde derivado de la paleta `agente` (border `#9DC9A0` o derivado de `#F0F8E8`).

Y `handleAssignAgent` (`item-view.tsx:273-277`) **reemplaza directo sin confirm**. Spec pide:
- Mini-toast/alert: `"This will replace «X» with «Y».\nContinue?"` con botones Cancel / Replace.

## Scope

- Mover el chip `by @agent-name` de panel separado a **inline en el header del título** (junto al `<input>` de title).
- Aplicar tokens verdes: usar `bg-tag-green` o crear token nuevo `--color-agent-pill-bg` / `--color-agent-pill-border` en `app/globals.css` y `tailwind.config.ts`.
- Estilo del chip: pill `rounded-full`, border 1 px, padding 2×8 px, font 11 px medium.
- Si `committedAgent === null` → no renderizar el chip ni reservar espacio.
- Botón "Assign Agent": añadir clase verde derivada (mismos tokens), prefijar con ícono `⌥` o SVG silueta.
- Confirm de reemplazo: si `currentAgentName` ya existe y se elige otro distinto, mostrar `window.confirm()` o un mini-modal custom (preferir custom para mantener look Japandi).

## Out of scope

- Refactor profundo del agent-selector dropdown.
- Cambiar la lógica de `extractAgent`/`applyAgent` en `lib/agent.ts` (la detección sigue igual).
- Eliminar el "manual remove" (`× Remove` button + `(removing)` con line-through) — se mantiene el comportamiento actual.

## Tareas

- ⬛ T02.1. Añadir tokens `--color-agent-pill-bg: #F0F8E8`, `--color-agent-pill-border: #9DC9A0`, `--color-agent-pill-text: #2F5132` en `app/globals.css`. Mapear a `bg-agent`, `border-agent`, `text-agent` en `tailwind.config.ts`.
- ⬛ T02.2. En `item-view.tsx`: extraer el chip a sub-componente `<AgentChip name removing onUnassign />` (cliente). Renderizar inline en el `<header>` del título (después del título, antes del separador derecho).
- ⬛ T02.3. Eliminar el panel `data-testid="assigned-agent-badge"` separado (líneas 494-531). Mantener el `data-testid` en el chip inline para no romper E2E (`tests/e2e/viewer-history-agent-skills.spec.ts` debe seguir pasando, ajustar selectores si hace falta).
- ⬛ T02.4. Si `committedAgent === null`: no renderizar el componente. Ajustar tests E2E que verifican el placeholder "Sin agente asignado" (debería desaparecer).
- ⬛ T02.5. Estilo del botón "Assign Agent" (`item-view.tsx:446-454`): aplicar clases verdes (`border-agent text-agent` en hover/idle) + prefijo `⌥`.
- ⬛ T02.6. Confirm de reemplazo en `handleAssignAgent`: si `currentAgentName && newName !== currentAgentName` → mostrar dialog. Implementar con un sub-componente `<ConfirmDialog>` reutilizable (o `window.confirm()` como mínimo viable; preferir custom).

## Skills a utilizar

- **`tailwind-design-system`** — añadir tokens nuevos sin hardcodear hex en componentes.
- **`vercel-react-best-practices`** — extracción de `<AgentChip>` y `<ConfirmDialog>` como client components.
- **`web-design-guidelines`** — verificar contraste del verde sobre blanco (WCAG AA mínimo).

## Riesgos

- Romper tests E2E que afirman sobre el panel separado (`getByTestId("assigned-agent-badge")` con asunción de bg-gray-50). Revisar `tests/e2e/viewer-history-agent-skills.spec.ts` antes de borrar el panel.
- El chip inline puede empujar el botón ★/☆ o desbordar a 1920×1080 si el nombre del agente es muy largo. Decidir un `max-width` con ellipsis (`truncate max-w-[180px]`).

## Definition of done

- [ ] El chip `by @agent` aparece **inline al lado del título**, no en panel separado.
- [ ] Color verde aplicado vía tokens (sin hex hardcodeado).
- [ ] Si no hay agente: no hay chip ni placeholder.
- [ ] Botón "Assign Agent" diferenciado visualmente (verde + ícono).
- [ ] Cambiar agente cuando ya hay uno → muestra confirm dialog antes de reemplazar.
- [ ] Tests E2E de agent siguen pasando (ajustar selectores si necesario).
- [ ] `npm run lint && npm run typecheck` limpios.
