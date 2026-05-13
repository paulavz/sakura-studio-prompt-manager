# 03 — Cierre Fase 15: skills strip sakura con × auto-remove

> **Bloque cubierto:** §5 de `phases/fase-9.1/CLAUDE_DESIGN_PROMPT.md`.
> **Estimación:** ~1 commit, sesión corta.

## Gap detectado en code review

`components/item-view.tsx:474-492` renderiza el panel de skills aplicadas con:
- Fondo `bg-gray-50`, chips blancos con `border-gray-200 text-gray-700`.
- **Sin botón `×`** para remover.

Spec pide:
- Strip inline **debajo del toolbar** (no panel full-width con bg gris).
- Una sola fila con scroll horizontal si excede.
- Chips compactos **sakura**: `bg rgba(255,183,197,0.15)`, border `rgba(255,183,197,0.4)`, color `#C45E78`, padding 2×8, font 11 medium.
- Cada chip incluye `✦ {name}` + botón `×`.
- **Click en `×` borra automáticamente** la línea `Usa la skill [X] para este desarrollo.` del `content` y marca dirty.
- **No diferenciación visual** entre skills draft y guardadas (la save bar ya comunica dirty).

Falta la utilidad `removeSkillFromContent(content: string, skillName: string): string` en `lib/skills.ts` — el actual solo tiene `applySkill` y `scanSkills`.

## Scope

- Crear `removeSkillFromContent` en `lib/skills.ts` que elimina la línea exacta `\n\nUsa la skill ${name} para este desarrollo.` (matching seguro contra `name` con regex escape).
- Cambiar el estilo del strip a sakura inline.
- Añadir botón `×` por chip que dispara `removeSkillFromContent` + actualiza `appliedSkills` (filtra por id) + marca dirty.
- Renderizar el strip a partir de `draftSkillNames` (no `committedSkillNames`) para que el cambio sea inmediato y la save bar aparezca.

## Out of scope

- Cambiar el dropdown del skill-selector (Fase 15 ya lo tiene).
- Cambiar la regla de inyección (sigue siendo el template de `lib/skills.ts`).
- Animaciones de entrada/salida del chip (cosmético, post-mockup).

## Tareas

- ⬛ T03.1. En `lib/skills.ts`: añadir
  ```ts
  export function removeSkillFromContent(content: string, skillName: string): string
  ```
  Implementación: regex `new RegExp(\`\\n\\nUsa la skill ${escapeRegex(skillName)} para este desarrollo\\.\`, "g")` y `content.replace(re, "")`. Trim trailing whitespace si queda.
- ⬛ T03.2. Test unitario en `lib/__tests__/skills.test.ts` (crear si no existe): cubrir
  - Borra la línea exacta.
  - No borra si el nombre no coincide.
  - Maneja nombres con caracteres regex (`[`, `.`, `*`).
  - Devuelve content sin trailing extra.
- ⬛ T03.3. En `item-view.tsx`: reemplazar el panel `applied-skills-panel` (líneas 474-492) por un strip inline:
  - Mover bajo el toolbar (`</div>` de la toolbar, línea 470, antes del `{/* Applied Skills panel */}` actual).
  - Estilo: `flex gap-2 overflow-x-auto px-8 py-2`, sin `border-b` doble.
  - Chip: `bg-sakura-soft border-sakura/40 text-variable-text` (tokens existentes), padding `px-2 py-0.5`, font `text-[11px] font-medium`.
  - Render: `draftSkillNames` (no `committedSkillNames`).
  - Botón `×` por chip → handler que llama `removeSkillFromContent(editedContent, name)` + `setAppliedSkills(prev => prev.filter(s => s.name !== name))` + `setMarkdown(newContent)`.
- ⬛ T03.4. Verificar que el strip no se muestra cuando `draftSkillNames.length === 0` (no reservar espacio).
- ⬛ T03.5. Actualizar `tests/e2e/viewer-history-agent-skills.spec.ts`:
  - Cambiar selector del strip si usa `applied-skills-panel` con asunción de bg gris.
  - Añadir caso E2E: añadir skill → click `×` en el chip → save bar visible → contenido sin la línea `Usa la skill X…`.

## Skills a utilizar

- **`tailwind-design-system`** — usar tokens sakura existentes (`bg-sakura-soft`, `border-sakura/40`).
- **`webapp-testing`** — añadir el test E2E del flujo remove + el unit de `removeSkillFromContent`.

## Riesgos

- `removeSkillFromContent` con regex puede borrar de más si el nombre del skill aparece en otro contexto. **Mitigar:** anclar el regex a `\n\nUsa la skill … para este desarrollo.` literal — no buscar el nombre solo.
- Si el usuario edita manualmente el content en raw mode y borra la línea, el strip seguirá mostrando la skill (porque `appliedSkills` es source of truth en columna). Esto es **conocido y aceptado** (ver comentario en `lib/skills.ts`).
- El strip horizontal con scroll en 1920×1080 puede ser raro si solo hay 2 chips. Probar visual.

## Definition of done

- [ ] `removeSkillFromContent` existe en `lib/skills.ts` con tests unitarios verdes.
- [ ] Strip de skills es **sakura**, no gris.
- [ ] Cada chip tiene `✦` y `×`.
- [ ] Click en `×` borra la línea del content + actualiza `appliedSkills` + dispara save bar.
- [ ] Strip no aparece cuando no hay skills aplicadas.
- [ ] Tests E2E pasando (incluido el caso nuevo de remove).
- [ ] `npm run lint && npm run typecheck` limpios.
