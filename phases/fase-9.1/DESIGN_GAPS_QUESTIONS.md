# Fase 9.1 — Análisis de huecos de diseño

> **Propósito:** identificar las funcionalidades implementadas en la app que **no tienen diseño formal** en el mockup actual de Claude Design (`design/Sakura Prompt Studio _standalone_.html`). Cada hueco se formula como un **bloque de preguntas** para llevar a la próxima sesión de Claude Design y producir mockups complementarios.

> **Convención:** las preguntas están agrupadas por superficie de UI; cada bloque incluye contexto técnico, opciones tentativas, y una **decisión por defecto** (lo que la app hace hoy) para que sea fácil discutir o validar.

---

## Resumen ejecutivo

El mockup actual cubre con detalle: **Sidebar**, **Gallery (lista de cards)**, y el **Viewer en modo lectura** (toolbar + render markdown + raw). NO cubre:

| Área | Estado del diseño | Estado de la implementación |
|---|---|---|
| Edición de título / categoría / tags del item | ❌ No diseñado | ✅ Implementado (inline) |
| Creación de nuevo item ("+ New") | ❌ No diseñado (solo el botón) | ✅ Implementado (`/items/new`) |
| Modo "edit" del cuerpo (Tiptap WYSIWYG editable + textarea Raw editable) | ❌ No diseñado (mockup es solo lectura) | ✅ Implementado |
| Save / Cancel + indicador de cambios sin guardar | ❌ No diseñado | ✅ Implementado |
| Versionado / History | ❌ No diseñado | ✅ Implementado (panel desplegable) |
| Asignación de Agente | ❌ No diseñado | ✅ Implementado (botón + badge + selector modal) |
| Selector modal de Skills (lista completa) | ⚠️ Parcial (mockup tiene dropdown pequeño) | ✅ Implementado como modal |
| Panel "Applied Skills" guardadas | ❌ No diseñado (mockup tiene strip inline `addedSkills`) | ✅ Implementado (full-width gray-50) |
| Panel Settings → Tags | ❌ No diseñado | ✅ Implementado (`app/settings/tags/page.tsx`) |
| Drawer de variables (Use Template) | ⚠️ Parcial (existe `_mockup-source/variables-drawer.jsx` pero no aparece en el HTML standalone abierto por defecto) | ✅ Implementado |
| Petal rain (animación success) | ⚠️ Existe `_mockup-source/petal-rain.jsx`, no integrado al flow visible | ✅ Implementado |

---

## Hueco 1 — Edición de metadatos del item (título, categoría, tags)

**Contexto.** En la app, al abrir un prompt, el usuario puede editar título (input inline), cambiar categoría (`<select>` redondeado) y editar tags (chips con `×` + input para añadir uno nuevo, con autocomplete). Todo esto vive **dentro** del header del viewer.

El mockup, en cambio, muestra título y tags como **lectura pura**, sin afordancia de edición visible.

### Preguntas

1. **¿El usuario edita estos metadatos directamente en el viewer, o se mueven a un panel dedicado?**
   - Opción A *(actual)*: edición inline en el header — siempre visible, siempre editable.
   - Opción B: edición inline pero "invisible hasta hover/foco" (chips estilo display, inputs sin border salvo al enfocar).
   - Opción C: botón ✎ (edit) en el toolbar que activa un "edit mode" con inputs visibles; en lectura, idéntico al mockup.
   - Opción D: panel lateral derecho (drawer secundario) con todos los metadatos.
   - **Default actual:** A.

2. **¿Cómo se representa el `<select>` de categoría en el estilo Sakura/Japandi?** El mockup no lo muestra. La app usa `rounded-full bg-gray-100 px-3 py-1 text-xs`.
   - ¿Pill estilo "tag" con ícono de chevron? ¿Sigue la paleta de la categoría (azul/verde/naranja/rosa) o gris neutro?

3. **¿El editor de tags acepta dos modos en un mismo input** (autocompletar existentes + crear nuevo con validación `snake_case`) **como un combobox visual unificado**, o son dos affordances separadas (chip-picker + botón `+ Add new`)?
   - **Default actual:** combobox unificado con dropdown de sugerencias, validación al hacer Enter.

4. **¿Validación visual del `snake_case`?** Hoy hay validación silenciosa. ¿Tooltip de error? ¿Borde rojo? ¿Hint inline en gris?

5. **Tag chips en el viewer header** — ¿deben verse exactamente igual a los chips de la card (10px mono, sakura si `hasVariables` else gris) o necesitan affordance de edición visible (botón `×`)?
   - **Default actual:** chips redondeados con `×` siempre visible — diverge del mockup.

---

## Hueco 2 — Creación de un nuevo item

**Contexto.** El mockup muestra un botón `+ New` (28×28, top-right del gallery header). No define qué pasa al hacer clic. La app navega a `/items/new`, una página separada con un formulario.

### Preguntas

6. **¿El "+ New" abre una página nueva, un modal, o un drawer lateral?**
   - Opción A *(actual)*: página dedicada `/items/new`.
   - Opción B: modal centrado con campos mínimos (título + categoría) y luego abre el viewer en modo edición.
   - Opción C: crea un item "borrador" en sitio y lo selecciona en la gallery (UX inline).
   - **Default actual:** A.

7. **¿Cuáles son los campos requeridos para crear?** ¿Título solo? ¿Título + categoría? ¿Permite empezar con `content` vacío o se exige al menos una línea?

8. **¿El nuevo item se persiste al instante o requiere un primer Save explícito?** Esto se entrelaza con la regla "no drafts" de CLAUDE.md.

9. **¿Hay una "categoría sugerida" según el contexto** (p.ej. si entré desde el filtro `Templates`, el nuevo item nace como `template`)?

---

## Hueco 3 — Modo edición del cuerpo del prompt

**Contexto.** El mockup renderiza markdown en modo lectura con un toggle Render/Raw donde Raw es un `<pre>` (no editable). La app es 100% editable: Tiptap en Render, `<textarea>` en Raw, con regla "no se puede cambiar de modo si hay cambios sin guardar" (CLAUDE.md §4).

### Preguntas

10. **¿La edición es "siempre activa" (la app de hoy) o requiere entrar a un "edit mode" explícito?**
    - Opción A *(actual)*: el cuerpo siempre es editable; cualquier teclazo marca dirty.
    - Opción B: se entra a edit mode con un click + botón Save aparece en la toolbar (UX tipo Notion).
    - Opción C: doble click para editar, click fuera para "fingir" guardar (pero CLAUDE.md prohíbe drafts → no recomendable).

11. **Estética del cursor / borde del editor.** Hoy hay `border border-gray-200 rounded-lg` alrededor del editor. ¿Se mantiene? ¿Solo aparece al enfocar? ¿Desaparece para que se sienta "documento" como en Notion/Linear?

12. **Estética del Raw textarea.** Hoy es `<textarea>` con border + bg-white. El mockup tiene un `<pre>` con bg `gray-50` + border + radius 8px + padding 20px 22px + mono 12.5px lh 1.7. ¿El `<textarea>` toma exactamente ese estilo (parece pre pero es input)?

13. **Toolbar de formato Tiptap.** Hoy NO hay toolbar de formato (bold, italic, listas, headings) — el usuario formatea con shortcuts o markdown puro en Raw. ¿Diseñar una toolbar minimal? ¿O mantener el approach "shortcuts only" para no contaminar el espacio?

14. **¿Qué pasa cuando el usuario pega texto con formato (HTML) en Tiptap?** Hoy: StarterKit decide. ¿Se quiere control explícito (paste as plain text por defecto)?

---

## Hueco 4 — Save / Cancel / cambios sin guardar

**Contexto.** Hoy: cuando `isContentDirty`, aparecen botones `Cancel` (gris) y `Save` (negro), y un texto "Unsaved changes" en ámbar dentro del toolbar.

### Preguntas

15. **¿Dónde viven Save/Cancel?**
    - Opción A *(actual)*: en la toolbar superior junto a los demás botones.
    - Opción B: en una barra inferior fija (bottom bar) que aparece solo cuando hay cambios — patrón "save bar" típico de Notion settings o GitHub.
    - Opción C: flotante inferior derecha (FAB con dos acciones).

16. **¿Cómo se visualiza el estado dirty?**
    - Opción A *(actual)*: texto "Unsaved changes" en ámbar.
    - Opción B: pequeño dot en el título.
    - Opción C: cambia el color de fondo del editor sutilmente.
    - Opción D: solo la presencia de los botones Save/Cancel ya lo comunica.

17. **¿Cancel pide confirmación?** Hoy descarta sin preguntar. CLAUDE.md dice "Cancelar = descarta (no hay drafts)" — confirmar que esto sigue siendo deseado, ya que descarta cambios sin warning.

18. **Feedback de Save exitoso.** Hoy: texto verde "✓ Saved" durante unos segundos. ¿Se reemplaza por petal rain? ¿Por un toast? ¿Por un check animado en el botón?

---

## Hueco 5 — Versionado / History

**Contexto.** Hoy: botón `History` en la toolbar; al hacer clic, despliega un panel full-width gris-50 con cards de versiones (timestamp + preview + botón "Restore"). Rotación FIFO 50→25 silenciosa (CLAUDE.md §5).

### Preguntas

19. **¿El History es un panel desplegable inline (actual), un drawer lateral derecho, un modal, o una página separada?**
    - Default actual: panel inline.

20. **Granularidad de la preview de cada versión.**
    - Opción A *(actual)*: primeras 100 chars del `content_snapshot`, mono.
    - Opción B: diff visual contra la versión anterior (verdes/rojos).
    - Opción C: render del markdown completo en una mini-card.

21. **¿Se muestra el contador "X versiones almacenadas (máx 50)"?** Hoy no hay indicador. Útil para que el usuario entienda la rotación.

22. **Restore.** Hoy: click → reemplaza el `content`, lo marca como dirty, y el usuario tiene que pulsar Save (lo cual genera otra versión). ¿Confirmación previa? ¿Restore es Save inmediato?

---

## Hueco 6 — Asignación de Agente

**Contexto.** Diseñado conceptualmente en CLAUDE.md §2-bis pero NO en el mockup visual. Hoy: botón "Assign Agent" en la toolbar + panel "Assigned Agent" full-width gris-50 con badge del nombre del agente o "Sin agente asignado" + botón "× Remove".

### Preguntas

23. **¿El botón "Assign Agent" es semánticamente distinto a "Add Skill" en lo visual?** Hoy son visualmente idénticos. CLAUDE.md insiste en separarlos por UX → ¿icono diferente? ¿color diferente? ¿posición diferente?

24. **¿Dónde se muestra el agente asignado?**
    - Opción A *(actual)*: panel full-width separado debajo del toolbar.
    - Opción B: chip inline al lado del título (estilo "by @agent").
    - Opción C: badge en la tarjeta de la gallery también (no solo en el viewer).

25. **¿Cardinalidad SINGULAR visible en el selector?** Hoy el selector muestra todos los agentes; al elegir uno nuevo, reemplaza silenciosamente al anterior. ¿Se avisa "esto reemplazará al agente X"?

26. **Cuando el usuario borra manualmente la línea `Actúa como el agente «X»…` del editor**, hoy el badge muestra "(removing)" tachado hasta que se guarda. ¿Esto es la UX deseada o se quiere algo más explícito?

---

## Hueco 7 — Selector / Panel de Skills

**Contexto.** El mockup tiene un dropdown pequeño (`SkillsDropdown` en `_mockup-source/markdown.jsx`), 240px de ancho, lista de skills con `name + description`. La app implementa un **modal** (`<SkillSelector>`) más grande y un panel separado de "Applied Skills" guardadas (full-width gris-50).

### Preguntas

27. **¿Se mantiene el dropdown del mockup o se prefiere el modal?**
    - Dropdown (mockup): rápido, pero se cierra al hacer scroll, limitado a ~6 items visibles.
    - Modal (actual): permite búsqueda, descripciones largas, escala mejor.

28. **¿"Applied Skills" se muestra como strip inline (mockup `addedSkills`, sakura outline) o como panel full-width gris (actual)?**
    - El mockup mezcla skills añadidas pero no guardadas con las activas en un solo strip. La app las separa por estado (no guardadas → en el editor; guardadas → panel).

29. **¿Cómo se quita una skill aplicada?** Mockup: chip con `×` en el strip. App actual: hay que ir al texto y borrar manualmente la línea `Usa la skill [X] para este desarrollo.` — luego Save.

---

## Hueco 8 — Panel Settings → Tags

**Contexto.** Página `app/settings/tags/page.tsx` (270 líneas) — listado, crear, eliminar tags con validación `snake_case`. No hay diseño en el mockup; tampoco hay link visible para llegar ahí desde la sidebar/header.

### Preguntas

30. **¿Cómo se accede a Settings?**
    - Opción A: ítem en la sidebar (icono ⚙) abajo, junto a "In flow".
    - Opción B: menú flotante en el branding (click en 🌸 Sakura Studio → menú).
    - Opción C: shortcut de teclado solamente.
    - Opción D: URL directa, sin entry point UI.
    - **Default actual:** D (no hay link).

31. **¿Settings es una página separada o un drawer/modal?**
    - Página separada (actual) preserva URL compartible y back-button.
    - Drawer es más rápido pero pierde contexto.

32. **¿Hay otras categorías de Settings además de Tags?** (Atajos, tema, atajos de teclado, configuración de Drawer de variables, exportar/importar...). Conviene definir el frame antes de seguir añadiendo páginas sueltas.

33. **Crear / Eliminar tag — UX detallada.**
    - ¿Confirmación al eliminar? ¿Y si el tag está en uso por items?
    - ¿Renombrar tags? Hoy no se puede.
    - ¿Stats por tag (cuántos items lo usan)?

---

## Hueco 9 — Drawer de variables ("Use Template")

**Contexto.** Existe `_mockup-source/variables-drawer.jsx` (288 líneas) que sí define el drawer, pero **no está visible por defecto en el HTML standalone**. CLAUDE.md describe el comportamiento (slide lateral derecho, input por variable única, "Copy Result" + petal rain).

### Preguntas

34. **¿El diseño del drawer en `variables-drawer.jsx` es vinculante (la fuente de la verdad para el drawer) o es exploratorio?** Hay que decidir si se trata como mockup oficial o como "borrador a actualizar".

35. **¿El "Copy Result" dispara petal rain en toda la pantalla o solo dentro del drawer?**

36. **¿Preview en vivo del resultado** mientras el usuario escribe los inputs, o solo al copiar?

37. **¿Inputs textarea autosize (CLAUDE.md) con qué estética exacta** (border, bg, max-height antes de scroll, indicador de longitud min/max)?

---

## Hueco 10 — Animaciones (Sakura Experience)

**Contexto.** CLAUDE.md §7 define petal rain en success de copy, hover glow en cards, drawer slide-in. `_mockup-source/petal-rain.jsx` existe pero no está integrado al flow visual del HTML standalone.

### Preguntas

38. **Duración / cantidad / trayectoria de los pétalos.** ~1.5s según CLAUDE.md. ¿Cuántos pétalos? ¿Trayectorias aleatorias o pre-definidas? ¿Spawn point (centro? top? full-width)?

39. **¿La animación se omite cuando el usuario tiene `prefers-reduced-motion: reduce`?** Hoy: hay que confirmar.

40. **Hover glow de cards.** Está implementado, pero CLAUDE.md lo asignaba a "Phase 10". ¿Se considera done o se quiere refinar (curva de easing, intensidad del glow, delay)?

---

## Próximos pasos sugeridos

1. **Triage rápido** con la usuaria sobre cuáles de los 40 huecos son **bloqueantes** para alcanzar pixel-perfect "satisfactorio" vs. cuáles pueden esperar a un Phase 10/11.
2. Para los bloqueantes, abrir una sesión de Claude Design con el HTML standalone como base y añadir las superficies faltantes (priorizar §3 Modo edición, §4 Save/Cancel, §5 History, §6 Agente — porque están todos en el viewer y rompen la paridad de la zona más visible).
3. Para los no bloqueantes (§8 Settings, §9 Drawer fino, §10 Animaciones), abrir issues en el tracker con un link a este documento y a las preguntas específicas.
4. Volver a este documento tras cada decisión y marcar las preguntas resueltas con ✅ + breve resumen de la decisión, para que sirva como bitácora.
