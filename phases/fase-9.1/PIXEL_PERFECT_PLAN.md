# Fase 9.1 — Plan Pixel-Perfect

> **Objetivo:** cerrar la brecha visual entre la implementación actual (post Fase 9) y el mockup de referencia (`design/Sakura Prompt Studio _standalone_.html`) hasta alcanzar paridad pixel-perfect en la **fuente de la verdad de tamaño**.

---

## 0. Fuente de la verdad (no negociable)

| Parámetro | Valor |
|---|---|
| Resolución física del display | **1920 × 1080** (FHD nativo) |
| Escalado Windows | **100 %** |
| Zoom navegador | **100 %** |
| Viewport CSS efectivo (px = px físicos) | **1920 × ~960** (descontando barra del navegador) |
| Densidad de píxeles | **1 dpr** (1 CSS px = 1 device px) |
| Browser de referencia | **Chromium** (Playwright) |

**Implicaciones:**

- El layout del mockup (sidebar 224px + gallery 320px + viewer flex-1) deja al viewer ≈ **1376 px** de ancho. Cualquier `max-width` interno del cuerpo del viewer debe pensarse para esa anchura.
- Como no hay escalado, **1 px CSS = 1 px de pantalla**: bordes de 1px, gaps de 4/6/8 px y radios de 5/7/8 px se ven exactamente como en el HTML standalone.
- Las baselines de tests visuales deben capturarse a **viewport 1920×960** (configurable en `playwright.config.ts`). Si la baseline actual está a otro tamaño, hay que regenerarla.
- Cualquier ajuste responsive (breakpoints `md:`, `lg:`) que cambie el comportamiento por debajo de 1920px **no afecta** la fuente de la verdad, pero no debe alterar el render a 1920.

---

## 1. Estado actual (resumen rápido)

Trabajo ya hecho en Fase 9 (rastreado en `phases/phase-9/PHASE9_MOCKUP_VALUES.md`):

- ✅ Sidebar 224px con branding, search, nav, footer + cherry-branch SVG + "In flow" pulse.
- ✅ Gallery 320px con header (filter label + count + "with variables" badge + botón `+ New` 28×28).
- ✅ Cards con tokens correctos (border 1px, radius 8px, shadow rest/active, tag chips por `hasVariables`, category badge por color).
- ⚠️ Viewer: implementado pero **sin haber sido diseñado en el mockup más allá del toolbar y el cuerpo de markdown**. Es la mayor fuente de drift visual (ver §3).
- ⚠️ Tokens nuevos (`--color-tag-orange`, `--color-tag-pink`, `--color-gray-50`, `--color-gray-300`, `--color-gray-400`, `--sidebar-width`, `--gallery-width`, `--radius-sm`) — confirmar que están todos en `app/globals.css`.

---

## 2. Brecha: Sidebar + Gallery (refinamiento)

Pequeños deltas detectados al revisar `components/gallery.tsx` contra `phases/phase-9/PHASE9_MOCKUP_VALUES.md`:

| # | Componente | Problema | Fix |
|---|---|---|---|
| 2.1 | Sidebar branding | El `text-sakura` aplicado al título "Sakura Studio" (`gallery.tsx:122`) **no existe en el mockup**: el título es `color:#000` con peso 600. | Cambiar `text-sakura` → `text-black`. |
| 2.2 | Sidebar branding emoji | El glifo 🌸 dentro del cuadrado tiene `text-sakura` aplicado (`gallery.tsx:119`), pero los emojis ignoran `color` — visualmente inocuo, pero hay que removerlo para limpieza. | Quitar la clase `text-sakura` del span. |
| 2.3 | Nav sections | Solo hay 2 secciones (`Home`, `Categories`). El mockup tiene 4: `Home`, `Templates`, `Agents`, `Skills` — cada una con sus propios items. | Reestructurar `nav` en 4 bloques colapsables (chevron rotando -90°/0°). El estado open/closed puede empezar como `useState` local sin persistir. |
| 2.4 | Gallery header "with variables" badge | Se renderiza siempre. El mockup lo muestra **solo si hay al menos un prompt con variables** en el filtro actual. | Condicional: `filteredItems.some(hasVariables)`. |
| 2.5 | Card hover/selected glow | La sombra rosa difusa (`box-shadow: 0 0 0 1px var(--sakura), 0 8px 24px var(--sakura-glow), …`) está marcada en Fase 9 como "Phase 10 owns this" pero ya está en `item-card.tsx:93`. Confirmar si se mantiene activa o si se restringe a `:hover` con `prefers-reduced-motion`. | Decisión rápida: mantener activa (ya implementada). Validar que la `transform: translateY(-2px)` no genere jitter en scroll. |
| 2.6 | Nav item icons | Los iconos elegidos (`◈ ♡ ▦ ◎ ⌥ ✦ ⬡`) no coinciden 1:1 con el mockup. El mockup tiene un set específico documentado en §"Sections to render" de `PHASE9_MOCKUP_VALUES.md`. | Reasignar iconos según `_mockup-source/sidebar.jsx`. |

---

## 3. Brecha: Viewer (la grande)

El **viewer del mockup** (`_mockup-source/markdown.jsx` → `PromptViewer`) tiene una estética compacta, una sola fila de toolbar, con tokens precisos. La implementación actual (`components/item-view.tsx`) es funcionalmente más rica pero estéticamente divergente.

### 3.1 Toolbar superior

**Mockup (1 fila, 12px 24px padding):**

```
[Título (15px/700) + 🌸] [tags chips abajo]    [Render|Raw pill] [Add Skill] [Copy ●] [🌸 Use Template]
```

**Actual:** dos filas separadas (`<header>` con título + tags + select de categoría, y `<div>` toolbar con mode-toggle + 5 botones + Save/Cancel).

| Token | Mockup | Actual | Acción |
|---|---|---|---|
| Padding toolbar | `12px 24px` | `px-8 py-3` (32×12) | Reducir a `px-[24px] py-[12px]`. |
| Título | `15px` / 700 | `text-lg` (18px) / 600 | `text-[15px] font-bold tracking-[-0.01em]`. |
| Tags en toolbar | chips sakura `font-mono` 10px (mismo estilo que en card) | chips redondeados con `×` para borrar (`rounded-full border-gray-200`) | Separar **edición** de **display**: mostrar chips estilo mockup; mover edición a un modo "edit" o a un popover. |
| View toggle | pill `gray-100` bg + 1px `gray-200` border + 3px padding, botón activo `white` con shadow `0 1px 3px rgba(0,0,0,0.1)`, font 11.5px, label "Render"/"Raw" | `bg-gray-100 p-1 rounded-lg`, font `text-sm`, label "Rendered"/"Raw" | Cambiar label "Rendered" → "Render"; ajustar tokens (font 11.5px, border 1px, radius 5px, padding 3px). |
| Add Skill button | `padding 6px 11px`, `radius var(--radius-sm)` (5px), border 1px gray-200, font 12px gray-600, glifo `✦` | `px-4 py-1.5 rounded-md text-sm` border gray-200 | Re-tokenizar a valores del mockup. |
| Copy button | **negro sólido** (`bg: var(--black)`, `color: var(--white)`, `border: 1px solid var(--black)`), `radius-sm`, font 12px | gris (`border-gray-200 text-gray-700`), label "Copy raw" | Cambiar a negro sólido + label "Copy". |
| Use Template button | **outline sakura** (`border: 1px solid rgba(255,183,197,0.6)`, `color: #C45E78`, fondo transparente, hover: bg `rgba(255,183,197,0.12)` + glow box-shadow) | gris idéntico a los demás | Re-estilar como botón sakura outline. Solo se muestra si `hasVariables(committed.content)`. |

### 3.2 Cuerpo del viewer

**Mockup:**

- Padding: `24px 28px`
- `max-width: 680px` para el contenido en modo Render
- Render: markdown custom con tipografías h1=22px, h2=16px, h3=13.5px, p=13.5px line-height 1.65, listas con bullet sakura, blockquote con barra sakura, code inline con bg gray-100, code block con bg gray-50 + border + radius-sm
- Raw: `<pre>` con `bg: gray-50`, `border: 1px gray-200`, `radius var(--radius)` (8px), `padding: 20px 22px`, `font-family: mono`, `font-size: 12.5px`, `line-height: 1.7`

**Actual:**

- Padding: `p-8` (32px)
- Render: Tiptap dentro de `<EditorContent>` con `prose prose-sm`, `min-h-[400px] p-4 border rounded-lg`
- Raw: `<textarea>` editable con `min-h-[400px] p-4 font-mono text-sm border rounded-lg`

**Decisión clave:** el mockup asume **modo solo-lectura**; nuestra app es editable (Tiptap WYSIWYG y textarea para Raw). La paridad pixel-perfect debe limitarse a:

1. Padding del wrapper (`24px 28px`).
2. `max-width: 680px` en el modo Render.
3. Mapping de Tiptap a las tipografías del mockup (override del CSS `prose` o reemplazar `prose` por reglas custom).
4. En Raw: cambiar el `<textarea>` para que **visualmente** parezca un `<pre>` (mismo bg, border, padding, mono 12.5px, line-height 1.7) — el `<textarea>` puede mantenerse para edición.

### 3.3 Lo que NO está en el mockup pero SÍ en nuestra app (drift por feature)

Cada uno necesita decisión: ¿se rediseña en Claude Design (ver §4 del informe), se mantiene como está aceptando que rompe pixel-perfect, o se mueve a un lugar menos visible?

- **Editor de título inline** + select de categoría dentro del header del viewer.
- **Editor de tags** con autocomplete y "Add new" inline.
- **History panel** (full-width gris-50 con cards de versiones).
- **Botones Save / Cancel** + indicador "Unsaved changes".
- **Assign Agent button** + **Assigned Agent badge** (full-width gray-50 con `Sin agente asignado` o nombre).
- **Applied Skills panel** (full-width gray-50 con chips redondeados — distinto al strip inline del mockup).
- **Mode toggle disabled** cuando hay cambios sin guardar.

Mientras no haya diseño formal de estos elementos, el plan recomienda **encapsularlos visualmente** en una "edit toolbar" secundaria que aparezca solo cuando el usuario entra en modo edición — manteniendo la vista por defecto pixel-perfect contra el mockup.

---

## 4. Plan de tareas (orden de ejecución sugerido)

> Cada tarea debería caber en un commit independiente. Marcar como ⬛ pendiente al iniciar.

### Bloque A — Refinamiento sidebar/gallery (rápido, bajo riesgo)

- ⬛ A1. Quitar `text-sakura` del título y emoji de branding (`gallery.tsx:119,122`).
- ⬛ A2. Reestructurar nav en 4 secciones (`Home`, `Templates`, `Agents`, `Skills`) con chevron colapsable.
- ⬛ A3. Reasignar glifos de nav items según `_mockup-source/sidebar.jsx`.
- ⬛ A4. Condicionar el badge "with variables" a `filteredItems.some(hasVariables)`.
- ⬛ A5. Verificar que todos los tokens (`--sidebar-width`, `--gallery-width`, `--radius-sm`, `--color-gray-{50,300,400}`, `--color-tag-{orange,pink}`) existen en `app/globals.css`.

### Bloque B — Viewer toolbar (re-tokenización)

- ⬛ B1. Crear branch visual `viewer-toolbar-pixel`. Reescribir el `<header>` + `<div>` toolbar como **una sola fila** con padding `12px 24px`.
- ⬛ B2. Aplicar tokens del mockup a botones (Render/Raw pill, Add Skill, Copy negro, Use Template sakura outline).
- ⬛ B3. Mover el editor de título y categoría a un **modo edit** disparado por click en título (o por botón ✎). Cuando no se está editando, mostrar título estilo mockup (`15px / 700`).
- ⬛ B4. Mover el editor de tags al mismo modo edit. En modo display, renderizar chips idénticos a los de la card (sakura si `hasVariables`, gris si no).
- ⬛ B5. Re-estilar el strip de "Applied Skills" como **chips inline** debajo del toolbar (no como panel full-width gris) — replicando el patrón del mockup `addedSkills`.

### Bloque C — Viewer cuerpo (tipografía y padding)

- ⬛ C1. Cambiar padding del `<main>` del viewer a `p-[24px_28px]`.
- ⬛ C2. Envolver el contenido en `<div className="max-w-[680px]">` para modo Render.
- ⬛ C3. Reemplazar `prose prose-sm` por reglas custom que repliquen las tipografías del mockup (h1=22px, h2=16px, h3=13.5px, p=13.5px lh-1.65, listas con bullet sakura, blockquote barra sakura, code inline bg gray-100, code block bg gray-50). Centralizar en `app/globals.css` bajo una clase `.prose-sakura`.
- ⬛ C4. Re-estilar el `<textarea>` de Raw para que se vea como `<pre>` (bg gray-50, border, radius 8px, padding 20px 22px, font-mono 12.5px, lh 1.7). Mantener funcionalidad editable.

### Bloque D — Encapsular drift (componentes sin diseño)

- ⬛ D1. Aislar History, Assigned Agent badge, Save/Cancel, "Unsaved changes" en un componente `<EditModeBar>` que aparece solo cuando `isContentDirty || showHistory || mostrar agente`.
- ⬛ D2. Aislar la página `app/settings/tags/page.tsx` (no aparece en el mockup) como página standalone que **no rompe** la paridad de la vista principal.

### Bloque E — Tests visuales

- ⬛ E1. Verificar `playwright.config.ts`: `viewport: { width: 1920, height: 960 }`, `deviceScaleFactor: 1`.
- ⬛ E2. Borrar las baselines obsoletas de Fase 9 (`tests/visual/__screenshots__/baseline/` y `*-snapshots/`).
- ⬛ E3. Generar nuevas baselines tras Bloques A+B+C (con `--update-snapshots`).
- ⬛ E4. Añadir un test visual específico del viewer (no existe uno enfocado solo en él en `tests/visual/`).
- ⬛ E5. Verificar `gallery-cards.spec.ts`, `sidebar.spec.ts`, `tag-chips.spec.ts`, `viewer.spec.ts`, `three-pane-layout.spec.ts` pasen contra las nuevas baselines.

### Bloque F — Verificación manual

- ⬛ F1. Abrir el HTML standalone (`design/Sakura Prompt Studio _standalone_.html`) y la app (`localhost:3000`) lado a lado en 1920×1080 nativo.
- ⬛ F2. Captura overlay (Pixelay, o screenshots solapados al 50% de opacidad) de las 3 zonas: sidebar, gallery, viewer.
- ⬛ F3. Recorrer las 5 categorías y comprobar tag chips, badges y filtros.
- ⬛ F4. Probar hover sobre cards (glow rosa), selected state, "+ New" hover.

---

## 5. Riesgos y trade-offs

| Riesgo | Mitigación |
|---|---|
| Mover edición de título/tags/categoría a un "modo edit" puede empeorar la UX para uso personal v1. | Validar con la usuaria antes de B3/B4. Alternativa: mantener inputs visibles pero **estilarlos** como display (sin border ni outline visible cuando no tienen foco). |
| Reemplazar `prose` por CSS custom puede romper el render de markdown ya guardado en items de prueba. | Probar contra los items semilla (`tests/visual/helpers/seed.ts`) que cubren h1, h2, listas, code, blockquote. |
| Las nuevas baselines pueden divergir entre máquinas (font hinting Windows vs. Linux CI). | Forzar Playwright a usar siempre el mismo build de Chromium y, si hay CI, ejecutar tests en contenedor con el mismo SO o tolerar ε bajo en `compare-to-baseline.ts`. |
| Tiptap inyecta atributos (`contenteditable`, `class`) que pueden alterar tipografía heredada. | Aplicar `.prose-sakura` directamente al `EditorContent` y usar `!important` solo si es estrictamente necesario. |
| El "modo edit" introduce estado nuevo (`isEditing`) que puede chocar con `isContentDirty`. | Definir reglas: `isEditing` controla **visibilidad de inputs**; `isContentDirty` controla **bloqueo del mode toggle y Save/Cancel**. Son ortogonales. |

---

## 6. Checklist de aceptación

Para considerar Fase 9.1 como **pixel-perfect** contra el mockup en 1920×1080@100%:

- [ ] Diff visual ≤ 0.5% entre screenshot de la app y screenshot del HTML standalone, medido por Playwright en cada uno de: `sidebar`, `gallery-empty`, `gallery-with-cards`, `card-hover`, `card-selected`, `viewer-render`, `viewer-raw`.
- [ ] Todos los tokens del mockup están en `tailwind.config.ts` o `app/globals.css` y ningún componente hardcodea hex (`#FFB7C5`, `#A0A0A0`, `#C45E78`, etc.) fuera de esos archivos.
- [ ] Las baselines en `tests/visual/__screenshots__/baseline/` y `*-snapshots/` son las **nuevas** (commit fechado en Fase 9.1).
- [ ] No hay regresiones funcionales: tests E2E (no visuales) siguen pasando.
- [ ] La usuaria, en review manual sobre su laptop, confirma "se ve igual al mockup".
