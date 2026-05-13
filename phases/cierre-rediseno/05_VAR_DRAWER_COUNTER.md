# 05 — Cierre Fase 18: contador `{N}/{MAX}` bajo cada input del Variables Drawer

> **Bloque cubierto:** §7 de `phases/fase-9.1/CLAUDE_DESIGN_PROMPT.md`.
> **Estimación:** ~1 commit, sesión muy corta (~20 min).

## Gap detectado en code review

`components/variable-drawer.tsx` (líneas 195-234) renderiza cada input pero **no muestra el contador `{N}/{MAX}`**. Es la única adición visual que pedía la Fase 18 sobre el v1 del drawer (decisión P37 del DESIGN_GAPS_QUESTIONS).

Spec exacta:
> Debajo de cada input añadir `{N} / {MAX}` en `text-[10px] text-gray-400`. Única adición visual del bloque. Sin borde rojo ni validación extra.

El petal rain en Copy Result (la otra parte de Fase 18) **ya está conectado** vía `handleCopy` → `setPetalTrigger` global. No es necesario duplicar.

## Scope

- Añadir línea `{N} / {MAX}` debajo de cada `<textarea>` en el drawer.
- Estilo exacto: `text-[10px] text-gray-400`. Alineación a la derecha del input.
- `N` = `value.length` actual. `MAX` = prop `maxVarLength`.
- **No** cambiar la validación ni los colores del borde (sigue rojo solo si hay `error`).
- **No** añadir borde rojo cuando `N > MAX` (el `error` existente lo cubre).

## Out of scope

- Cualquier otro cambio en el drawer (layout, animaciones, validación).
- Tooltip o mensaje al pasar el límite.
- Min length counter (solo MAX, como pide la spec).

## Tareas

- ⬛ T05.1. En `components/variable-drawer.tsx`, dentro del `.map((name, index) => …)` (después del `{error && …}`, antes del `</div>` que cierra el item):
  ```tsx
  <span className="text-[10px] text-gray-400 self-end">
    {value.length} / {maxVarLength}
  </span>
  ```
- ⬛ T05.2. Smoke manual: abrir un prompt con variables, escribir texto, verificar que el contador actualiza en tiempo real.
- ⬛ T05.3. Si hay snapshot visual de `variable-drawer-open.png` o equivalente, regenerarlo (queda pendiente para Fase 06 = test final, no urgente aquí).

## Skills a utilizar

- **`tailwind-design-system`** — usar tokens existentes, no hex.

## Riesgos

- El `self-end` puede chocar con el layout `flex flex-col gap-1.5` del item. Validar visualmente.
- Si el contador queda demasiado discreto (10 px gris-400), considerar cambio menor de tipografía (sin tocar el spec — primero implementar y validar a 1920×1080).

## Definition of done

- [ ] Contador `N / MAX` visible bajo cada input del drawer.
- [ ] Actualiza en tiempo real al escribir.
- [ ] Estilo `text-[10px] text-gray-400` aplicado.
- [ ] Sin regresión en validación ni en bordes rojos.
- [ ] `npm run lint && npm run typecheck` limpios.
