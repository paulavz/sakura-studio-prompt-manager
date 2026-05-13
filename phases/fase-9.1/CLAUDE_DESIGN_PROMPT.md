# Sakura Prompt Studio — Design brief para Claude Design

> **Objetivo:** extender el mockup existente (`design/Sakura Prompt Studio _standalone_.html`) para cubrir las superficies aún no diseñadas, siguiendo las decisiones tomadas en la sesión Fase 9.1. Producir HTML/JSX standalone con la misma estética Japandi (paleta sakura, tokens ya definidos).

---

## Contexto base (no cambia)

- **Stack visual:** ya hay un standalone HTML con sidebar (224 px), gallery (320 px) y viewer (flex-1) en lectura. Tokens, paleta, tipografía e iconografía ya consolidados en `phases/phase-9/PHASE9_MOCKUP_VALUES.md`.
- **Pantalla de referencia:** 1920×1080 nativo, escalado 100%, dpr 1. Una unidad CSS = un píxel físico.
- **Reglas estéticas no negociables (de CLAUDE.md):**
  - Fondo blanco `#FFFFFF`, texto negro `#000000`.
  - Sakura `#FFB7C5` reservado a 3 usos: glow rosa difuso en hover/active de cards, chips de variables `{{ }}`, animaciones de feedback. **No usar en otros lugares.**
  - Bordes 1 px sutiles, padding/gaps generosos, cero decoración superflua.
  - Tokens en `tailwind.config.ts` / `app/globals.css`. Prohibido hardcodear hex en componentes.

---

## Lo que ya está diseñado (referencia, no rediseñar)

- **Sidebar:** branding `🌸 Sakura Studio / Prompt Manager`, search inset, nav con secciones colapsables, footer con `CherryBranch` SVG + indicador `In flow` con `zen-pulse`.
- **Gallery:** header (filter label + count + badge `🌸 with variables` + botón `+ New` 28×28), lista de cards.
- **Card:** título 13.5/600, indicador 🌸, ♡/♥ favorite, tag chips (sakura si `hasVariables` else gris), badge categoría coloreada, fecha.
- **Viewer toolbar (1 fila, padding 12×24):** título 15/700 + 🌸, tag chips inline, pill toggle Render/Raw, Add Skill (✦), Copy (negro), Use Template (sakura outline).
- **Viewer body:** padding 24×28, `max-width: 680px`. Render = markdown custom (h1=22, h2=16, h3=13.5, p=13.5/1.65, listas con bullet sakura, blockquote barra sakura). Raw = `<pre>` con bg `gray-50` + border + radius 8 + mono 12.5/1.7.

---

## Decisiones de diseño (40/40 respondidas) — input para los nuevos mockups

### Bloque 1 — Edición inline siempre visible (REVISADO post-Fase 12)

> ⚠️ **Decisión revisada post-Fase 12.** El concepto original era un botón `✎ Edit / Done editing` que alternaba lectura/edit mode. Tras probarlo, la usuaria prefiere **eliminar el botón y volver a "siempre editable"**. Ver `phases/fase-12.5/PLAN.md` para el rollback.

**Concepto actualizado:** título / categoría / tags / cuerpo son **siempre editables inline**, sin botón de modo. Cualquier cambio dispara la save bar inferior (Bloque 2).

- **Sin botón `✎ Edit` en la toolbar.** La toolbar tiene: Add Skill, Copy, Use Template (y los específicos de Bloques 4 / 5). Sin alternancia de modo.
- **Título:** `<input>` siempre visible, sin border salvo focus, tipografía 15/700.
- **Categoría:** pill con color de la categoría + chevron, abre dropdown nativo. Siempre clickeable.
- **Tags en el header:** combobox unificado siempre visible. Chips con `×` (afordancia de borrar visible) + input al final con autocomplete + create-on-Enter (validación snake_case con hint en gris bajo el input).
- **Cuerpo:**
  - Render: Tiptap **siempre editable**, sin border (estilo Notion). Solo shortcuts de formato; sin toolbar.
  - Raw: `<textarea>` con look de `<pre>` del mockup (bg `gray-50`, border 1 px gray-200, radius 8 px, padding 20×22, mono 12.5/1.7).
  - Paste de HTML: pegar como texto plano por defecto. `Ctrl+Shift+V` mantiene formato.
- **Mode toggle Render/Raw:** disabled cuando `isContentDirty` hasta Save/Cancel (CLAUDE.md §4).

**Mockups a producir:** ninguno nuevo. El "estado lectura" del viewer se descarta como mockup objetivo; la referencia visual es el viewer con inputs inline siempre visibles. Si Claude Design produjo los mockups #2 (edit mode) y #3 (combobox), siguen siendo útiles como referencia visual del look de los inputs.

**Trade-off aceptado:** ligero drift visual respecto al mockup original (inputs y chips con `×` visibles en lugar de chips estilo card). Se prioriza la usabilidad (1 click menos en cada edición).

---

### Bloque 2 — Save / Cancel bar

- **Bottom bar fija** que aparece **solo cuando `isContentDirty === true`**. Se desliza desde abajo (motion suave).
- Layout: full-width, altura ~52 px, fondo blanco con `border-top: 1px solid #E8E8E8` y leve `box-shadow: 0 -2px 8px rgba(0,0,0,0.04)`.
- Contenido (alineado a la derecha):
  - Botón `Cancel` (gris, secundario; descarta sin confirmación).
  - Botón `Save` (negro sólido, primario).
- **No hay texto explícito "Unsaved changes"**: la presencia de la bar ya comunica el estado dirty.
- **Feedback de Save exitoso:** **petal rain a pantalla completa** + la bar se desliza hacia abajo (desaparece).

**Mockup a producir:**
5. Save bar visible (estado dirty), con micro-spec de motion (slide-up easing, duración).

---

### Bloque 3 — History drawer

- **Drawer lateral derecho** (mismo patrón visual que el Variables Drawer). Ancho ~360 px.
- Trigger: botón `History` en la toolbar (mantener posición actual).
- Header del drawer:
  - Título `Version History`.
  - Subtítulo `N / 50 versions stored` en gris-400 (refleja la rotación FIFO 50→25 silenciosa).
  - Botón `×` para cerrar.
- Lista de versiones (cards verticales, gap 8 px):
  - Timestamp (top, `text-xs gray-500`, e.g. `May 11, 2026 · 14:32`).
  - Preview: primeras ~120 chars del `content_snapshot`, mono 11 px, `text-gray-700`, truncado.
  - Botón `Restore` (outline gris, alineado a la derecha).
  - **Confirm dialog antes de Restore:** `"Restore this version? Your current changes will be discarded."`

**Mockup a producir:**
6. History drawer abierto con 4-5 versiones de ejemplo.
7. Confirm dialog para Restore.

---

### Bloque 4 — Agente (chip "by @agent")

- **Chip inline al lado del título** del prompt en la toolbar del viewer, estilo `by @agent-name`.
  - Visual: pill **verde** (paleta de la categoría `agente`, `bg-tag-green` `#F0F8E8`), border 1 px `gray-200`, font 11 px medium, prefijo `by` en `gray-500`, nombre del agente en `gray-800`.
  - Si no hay agente: el chip no se muestra (no hay placeholder "Sin agente"); el espacio se cierra.
- **Botón "Assign Agent"** en la toolbar (junto a Add Skill):
  - **Visualmente diferenciado** de Add Skill: ícono `⌥` (o silueta de persona) + el botón hereda el verde de la paleta `agente` (border `#9DC9A0` o similar derivado de `#F0F8E8`).
- **Reemplazo:** al elegir un agente cuando ya hay uno asignado, mostrar mini-toast/alert: `"This will replace «X» with «Y».
Continue?"` con botones Cancel / Replace.
- **Manual remove (usuario borra la línea del editor):** el chip muestra el nombre con `line-through` + sufijo en gris `(removing)` hasta que se hace Save (estado actual, mantener).

**Mockups a producir:**
8. Toolbar del viewer con chip `by @agent-name` visible, junto al título.
9. Toolbar sin agente asignado (espacio cerrado, sin placeholder).
10. Selector de agente con confirm de reemplazo.

---

### Bloque 5 — Skills

- **Selector de Skills:** dropdown anclado al botón `Add Skill` (no modal). Ancho ~280 px.
  - Header del dropdown: input de búsqueda integrado (`Search skills…`), 12 px, font normal, sin border, focus subtle.
  - Lista: skills filtradas, cada item con `✦ {name}` (12.5 px medium) + `{description}` (11 px gray-400). Hover = `bg-gray-50`.
  - Scroll interno si la lista pasa los 6 items visibles.
- **Strip inline de skills aplicadas** debajo del toolbar (no panel full-width):
  - Una sola fila con scroll horizontal si excede.
  - Chips compactos sakura (mismo estilo que el mockup `addedSkills`): `bg rgba(255,183,197,0.15)`, border `rgba(255,183,197,0.4)`, color `#C45E78`, padding 2×8, font 11 medium.
  - Cada chip incluye `✦ {name}` + botón `×`. **Click en `×` borra automáticamente** la línea `Usa la skill [X] para este desarrollo.` del content y marca dirty.
  - **No diferenciación visual** entre skills draft y guardadas (la save bar comunica dirty).

**Mockups a producir:**
11. Strip de skills aplicadas (3-4 chips) bajo el toolbar.
12. Dropdown del selector de Skills abierto, con search activo y resultados filtrados.

---

### Bloque 6 — Settings (página + entry point)

- **Entry point:** ítem `⚙ Settings` en el footer de la sidebar, **sobre** el indicador `In flow` (no debajo, para no romper la composición del cherry branch + In flow).
- **Settings = página separada** `/settings` con **sub-navegación interna** estilo macOS Settings:
  - Sidebar interna izquierda (~200 px): lista de secciones.
  - Contenido a la derecha (`flex-1`).
- **Secciones a diseñar** (en orden):
  1. **Tags** (la única confirmada para v1; existe ya en código).
  2. **Variables Drawer** — defaults globales `MIN_VAR_LENGTH` / `MAX_VAR_LENGTH` (ver CLAUDE.md "Variables de entorno").
  - (Apariencia, Atajos, Export/Import → no priorizadas en esta sesión.)
- **Sección Tags — UX detallada:**
  - Lista de tags ordenada alfabéticamente.
  - Cada fila: `slug` (mono 13 px) + contador "used by N items" (gray-400).
  - Botón `+ New tag` arriba (mismo estilo que `+ New` de la gallery).
  - Crear: input inline con validación `snake_case` (hint en gris bajo el input, mensaje exacto: `Use snake_case (lowercase letters, digits, underscores; must start with a letter).`).
  - Eliminar:
    - Si la tag está **en uso por ≥1 item** → botón `Delete` **deshabilitado** con tooltip `Used by N items. Reassign or remove from items first.`
    - Si la tag es **huérfana** → botón `Delete` activo, requiere **confirm dialog** `Delete tag «{slug}»? This cannot be undone.`
  - **No se permite renombrar** en v1 (decisión: scope mínimo).

**Mockups a producir:**
13. Sidebar con `⚙ Settings` añadido, ubicación exacta sobre `In flow`.
14. Página `/settings` con sub-nav y sección Tags activa.
15. Estado de "Delete deshabilitado" con tooltip por tag en uso.
16. Confirm dialog de delete.
17. Sección "Variables Drawer" (defaults MIN/MAX con sliders o inputs numéricos).

---

### Bloque 7 — Variables Drawer (mantener v1)

> **Decisión revisada (post-9.1):** la usuaria prefiere el drawer del v1 — sencillo y a la derecha. Se descarta el preview en vivo y el layout 2 columnas. El v1 (`components/variable-drawer.tsx` + `_mockup-source/variables-drawer.jsx`) sigue siendo la **fuente de verdad**.

- **Layout:** drawer lateral derecho del v1, una sola columna con la lista de inputs. Sin cambios de tipografía, paddings ni botones.
- **Inputs autosize:** debajo de cada input añadir `{N} / {MAX}` en `text-[10px] text-gray-400`. Única adición visual del bloque. Sin borde rojo ni validación extra (decisión P37).
- **Botón "Copy Result"** dispara **petal rain a pantalla completa** (no solo en el drawer). El drawer no se cierra tras el Copy.

**Mockups a producir:** ninguno — el v1 ya es la referencia. Si Claude Design v2 envió un mockup nuevo del drawer, **se ignora**.

---

### Bloque 8 — Animaciones

- **Petal rain:** **estado actual mantenido** (parámetros del `_mockup-source/petal-rain.jsx`: ~12 pétalos, spawn top, ~1.5 s, trayectorias aleatorias con leve oscilación). Disparado en: Save exitoso, Copy del viewer, Copy del Variables Drawer.
- **Hover glow de cards:** mantener tal cual (translate -2 px + double box-shadow sakura). No refinar.
- **`prefers-reduced-motion`:** **NO se respeta** en v1 (decisión consciente: la sakura experience prima). Documentar esta decisión en `CLAUDE.md` para cuando llegue una a11y review.
- **Zen pulse del "In flow":** sin cambios.

> No se necesitan mockups nuevos para este bloque; las animaciones ya están especificadas o implementadas.

---

## Constraint visual común a todos los nuevos mockups

- Mismos tokens (`--color-sakura`, `--color-gray-*`, `--radius`, `--radius-sm`, `--sidebar-width`, `--gallery-width`).
- Misma tipografía (Inter UI + JetBrains Mono code).
- Mismas escalas de iconos (`✦`, `⌥`, `▦`, `◎`, `⌘`, etc.) y SVGs (búsqueda, chevron, search).
- Cualquier nuevo color, radio, espaciado o ícono debe **proponerse como token** y añadirse a la sección "Design tokens" del documento de valores.

---

## Lista consolidada de mockups a producir (17)

| # | Superficie | Estado |
|---|---|---|
| 1 | Viewer en lectura (referencia) | existe — usar como base |
| 2 | Viewer en edit mode | nuevo |
| 3 | Combobox de tags con dropdown + "Add new" | nuevo |
| 4 | Pill de categoría desplegado | nuevo |
| 5 | Save bar fija (estado dirty) | nuevo |
| 6 | History drawer abierto | nuevo |
| 7 | Confirm dialog Restore | nuevo |
| 8 | Toolbar viewer con chip `by @agent` | nuevo |
| 9 | Toolbar viewer sin agente | nuevo |
| 10 | Selector de agente con confirm de reemplazo | nuevo |
| 11 | Strip de skills aplicadas (chips inline) | nuevo |
| 12 | Dropdown selector de Skills con search | nuevo |
| 13 | Sidebar con `⚙ Settings` | nuevo |
| 14 | Página /settings con sub-nav + sección Tags | nuevo |
| 15 | Tag con Delete deshabilitado + tooltip | nuevo |
| 16 | Confirm dialog delete tag huérfana | nuevo |
| 17 | Sección Settings → Variables Drawer (readonly) | nuevo |

> **Variables Drawer principal:** **NO se rediseña**. El v1 actual (`_mockup-source/variables-drawer.jsx`) es la fuente de verdad. La Fase 18 solo añade contador `N/MAX` y unifica petal rain.

---

## Entregable esperado de Claude Design

1. Un **HTML standalone actualizado** (mismo formato que el actual) que incluya todos los nuevos estados, navegables vía interacciones simuladas o tabs internos.
2. Una sección de **Design tokens** actualizada si se introducen colores/radios/espaciados nuevos (verde derivado para botón Agente, ancho del History drawer, etc.).
3. Anotaciones inline (comentarios HTML o sección "Notes") con motion specs (duración, easing) para Save bar, drawers, petal rain.
