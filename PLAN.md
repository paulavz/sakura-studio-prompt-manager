# 🌸 Sakura Prompt Studio — Plan de Implementación por Fases

Plan secuencial desde proyecto vacío hasta producto desplegado. Cada fase entrega valor verificable. Prioridad: **funcional rápido > completo**. Decisiones técnicas y de UX están definidas en `CLAUDE.md`; este documento solo orquesta el orden.

**Hito MVP usable:** al terminar la **Fase 5** ya tienes la herramienta sirviéndote para tu trabajo diario (gallery + edición + variables drawer). Las fases 6–11 son enriquecimiento.

---

## Fase 0 — Cimientos del repositorio

**Objetivo:** repo arrancable con la identidad visual ya cargada. Cualquier página renderizada respeta los tokens Sakura sin que haya que tocar nada.

**Responsabilidades:**
- Inicializar Next.js 14 con App Router y Tailwind.
- Definir tokens de diseño en `tailwind.config.ts`: color `sakura` (`#FFB7C5`), familias `Inter` y `JetBrains Mono`, escala de espaciado generosa, borde 1px sutil como default.
- Cargar fuentes vía `next/font`.
- Layout raíz con fondo `#FFFFFF` y tipografía negra global.
- Estructura base de carpetas: `app/`, `components/`, `lib/`.
- README mínimo apuntando a `CLAUDE.md` como fuente de verdad.

**Dependencias:** ninguna.

---

## Fase 0.5 — Limpieza del intento PocketBase

**Contexto:** durante la primera tentativa de Fase 1 se introdujo código apuntando a PocketBase + PocketHost. Al confirmar que PocketHost no ofrece tier gratuito sin tarjeta, se decide migrar a Supabase. Antes de tocar nada nuevo hay que dejar el repo limpio.

**Objetivo:** eliminar todo rastro de PocketBase para que la nueva Fase 1 empiece desde un estado coherente con `CLAUDE.md`.

**Responsabilidades:**
- Borrar `lib/pocketbase.ts`.
- Borrar `app/smoke-test/page.tsx` (la verificación se reescribirá en la nueva Fase 1).
- Desinstalar la dependencia `pocketbase` del `package.json` (`npm uninstall pocketbase`) y verificar que no queda en `node_modules` ni en el lockfile.
- Limpiar `.env.local` y `.env.example`: eliminar `NEXT_PUBLIC_PB_URL`, `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`. Conservar `MIN_VAR_LENGTH`, `MAX_VAR_LENGTH`, `NEXT_PUBLIC_AUTH_ENABLED`.
- Buscar referencias residuales (`pocketbase`, `PB_`, `pockethost`) en el código y eliminarlas.
- Verificación final: `npx tsc --noEmit` sin errores y `npm run dev` arranca con la página por defecto del scaffold (Fase 0).

**Dependencias:** Fase 0.

**Hecho cuando:** el repo no contiene ni una sola línea referente a PocketBase y el dev server sigue funcionando como al final de la Fase 0.

---

## Fase 1 — Backend vivo (Supabase + esquemas)

**Objetivo:** Postgres gestionado por Supabase accesible desde la app, con todas las tablas del modelo final ya creadas y RLS activa.

**Responsabilidades:**
- Reutilizar el proyecto Supabase existente de la usuaria o crear uno nuevo dedicado a Sakura. Anotar la `Project URL`, `anon key` y `service role key`.
- Crear las tablas según `CLAUDE.md`: `items`, `versions`, `tags`. Tipos exactos (uuid PK, jsonb tags, check constraints).
- Habilitar RLS en las tres tablas. Políticas iniciales filtrando por `owner = auth.uid()` (en `versions`, vía subquery sobre el `owner` del `item_id` referenciado).
- `check constraint` `slug ~ '^[a-z][a-z0-9_]*$'` en `tags.slug` (validación snake_case en backend).
- Función Postgres `rotate_versions(item_id uuid)` que borra las 25 versiones más antiguas cuando hay más de 50, expuesta como RPC para llamarla desde el server action de guardado.
- Versionar todo lo anterior como migraciones SQL en `supabase/migrations/` (Supabase CLI).
- Instalar `@supabase/supabase-js` y `@supabase/ssr`.
- Crear `lib/supabase/server.ts` y `lib/supabase/client.ts` siguiendo el patrón oficial de `@supabase/ssr` para Next App Router.
- Variables de entorno en `.env.local` y `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only), más las heredadas (`MIN_VAR_LENGTH`, `MAX_VAR_LENGTH`, `NEXT_PUBLIC_AUTH_ENABLED`).
- Crear la cuenta de uso personal v1 desde el dashboard de Supabase (Auth → Users → Add user). Anotar su `id` para sembrar items con el `owner` correcto.
- Verificación: una página de smoke test (`app/smoke-test/page.tsx`) que ejecute `select count(*) from items` con la sesión de v1 y muestre el resultado. Se borra al final de la fase.

**Dependencias:** Fase 0.5.

---

## Fase 2 — Galería read-only

**Objetivo:** entrar a la app y ver visualmente todos los items existentes, navegables por categoría. Sin editar todavía.

**Responsabilidades:**
- Insertar manualmente 5–10 items semilla desde el dashboard de Supabase (Table Editor) o vía SQL, asignando `owner` = id del usuario v1.
- Página `/` con sidebar de categorías + grid de cards.
- Cards minimalistas: solo título + chips de tags. Sin glow ni animaciones todavía (van en Fase 9).
- Búsqueda fuzzy local por título (filtro client-side sobre los items ya cargados).
- Toggle "Solo favoritos".
- Indicador 🌸 junto al título cuando el `content` contenga variables `{{ }}` → requiere un primer borrador de `lib/variables.ts` (solo la función de detección, no aún el reemplazo).
- Las cards son links navegables a `/items/[id]` (la ruta puede devolver 404 esta fase).

**Dependencias:** Fase 1.

---

## Fase 3 — Visor de item (dual view, read-only)

**Objetivo:** abrir un item y leerlo cómodamente en ambos modos.

**Responsabilidades:**
- Ruta `/items/[id]`.
- Toggle Rendered ⇄ Raw, ambos en modo lectura.
- Render markdown con `react-markdown` + Shiki para syntax highlighting.
- Modo Raw: texto plano monoespaciado, no editable aún.
- Botón "Copiar contenido" (copia plano, sin reemplazo de variables — eso es Fase 5).
- Header del item: título, categoría, tags. Sin acciones de edición todavía.

**Dependencias:** Fase 2.

---

## Fase 4 — Edición + guardado + versionado (MVP funcional)

**Objetivo:** crear, editar y guardar items con versionado estricto. A partir de aquí ya sirve como gestor real.

**Responsabilidades:**
- Activar edición en ambos modos: Tiptap WYSIWYG en Rendered, textarea en Raw.
- Implementar la **regla estricta sin drafts**: si hay cambios sin guardar, bloquear cambio de modo hasta Guardar o Cancelar.
- Acción Guardar: actualiza `items.content` y crea entrada en `versions` en la misma transacción.
- Lógica de rotación FIFO en `lib/versioning.ts`: al pasar de 50, borrar las 25 más antiguas silenciosamente.
- Página "Crear nuevo item" con selector de categoría obligatorio.
- Combo box de tags: autocomplete sobre `tags` existentes + opción "Add new" que valida `snake_case` y crea entrada en `tags` antes de asignar.
- Panel de historial de versiones con preview y "Restaurar versión" (la restauración es a su vez un guardado → genera nueva entrada).
- Toggle de favorito.

**Dependencias:** Fase 3.

**Hito:** al cerrar esta fase, la herramienta ya es usable diariamente como gestor de prompts.

---

## Fase 5 — Motor de variables y Drawer

**Objetivo:** ejecutar prompts parametrizados rápidamente. Es la funcionalidad diferencial.

**Responsabilidades:**
- Completar `lib/variables.ts`: detección, lista de únicas, motor de reemplazo (una variable repetida = un solo input que reemplaza todas las ocurrencias).
- Botón "Usar Template" en la vista del item → abre Drawer lateral derecho.
- Drawer con un textarea autosize por variable única, validando `MIN_VAR_LENGTH` / `MAX_VAR_LENGTH`.
- Botón "Copiar Resultado": ejecuta reemplazo, copia al clipboard, dispara animación de éxito (la animación viene en Fase 9; aquí basta con un toast neutro).
- Drawer sin persistencia: cierra y olvida.
- Animación de slide-in del Drawer con Framer Motion ya aquí (no es decorativa, es funcional).

**Dependencias:** Fase 4 (necesita visor de item completo).

**Hito MVP:** al terminar esta fase tienes el producto core. Las siguientes fases enriquecen.

---

## Fase 6 — Inyector de Skills

**Objetivo:** componer prompts añadiendo conocimiento desde otros items.

**Responsabilidades:**
- Botón "Add Skill" en la vista del item.
- Selector con la lista de items con `category = skill`.
- Al seleccionar: appendear al final del editor el string `\n\nUsa la skill [Nombre] para este desarrollo.` (solo en editor, no guarda).
- `lib/skills.ts`: función de scan que extrae las skills aplicadas a partir del `content` guardado.
- Panel "Skills aplicadas" en la vista del item, alimentado solo por el contenido **guardado**.
- Alerta de cambios sin guardar al añadir una skill y navegar/cambiar de modo.

**Dependencias:** Fase 4.

---

## Fase 7 — Asignador de Agente

**Objetivo:** declarar el rol/persona del prompt. Mismo patrón que Skills pero singular y al inicio.

**Responsabilidades:**
- Botón "Assign Agent" separado del de "Add Skill".
- Selector con items con `category = agente`.
- Al seleccionar: insertar `Actúa como el agente [Nombre] para este desarrollo.\n\n` al **inicio** del editor.
- Reemplazo automático: si ya había un agente asignado, eliminar la línea anterior y escribir la nueva.
- `lib/agent.ts`: detectar la línea inicial, extraer el nombre, reemplazar.
- Panel "Agente asignado" como badge separado: muestra el nombre, o "Sin agente asignado" si no detecta.
- Mismo flujo no-draft que Skills.

**Dependencias:** Fase 6 (reutiliza patrones de UI y de detección).

---

## Fase 8 — Gestión de Tags (Settings)

**Objetivo:** mantener limpia la taxonomía de tags.

**Responsabilidades:**
- Página `/settings/tags`.
- Listar todos los tags de la collection `tags`.
- Crear, renombrar y eliminar tags con confirmación.
- Validación `snake_case` en cliente (espejo de la regla del backend).
- Mostrar contador de items que usan cada tag.

**Dependencias:** Fase 4 (la collection `tags` ya se usa desde ahí).

---

## Fase 9 — Sakura Experience (animaciones)

**Objetivo:** la capa estética que diferencia el producto. Se hace al final porque depende de que todo el flujo funcional ya esté en sitio.

**Responsabilidades:**
- Lluvia de pétalos (Framer Motion) disparada al copiar exitosamente desde Drawer o vista principal. Duración ~1.5s, no intrusiva.
- Hover glow rosa difuso en cards de la galería.
- Pulir easing del Drawer y de transiciones entre Rendered ⇄ Raw.
- Verificar que el rosa Sakura solo aparece en los 3 usos permitidos (hover cards, chips de variables, animaciones de feedback).

**Dependencias:** Fases 2, 5.

---

## Fase 10 — Multi-user ready

**Objetivo:** dejar el flag de auth listo para activar cuando quieras compartir la herramienta.

**Responsabilidades:**
- Auditar que todas las queries a Supabase pasan por la sesión RLS y que las políticas filtran por `owner = auth.uid()` en las tres tablas.
- Confirmar que cada item creado en v1 tiene el `owner` igual al `id` del usuario personal de v1.
- Implementar pantalla de login con Supabase Auth (oculta tras `NEXT_PUBLIC_AUTH_ENABLED=false` por defecto). Se puede usar Supabase Auth UI o un formulario propio que llame a `signInWithPassword` / `signInWithOtp`.
- Configurar `middleware.ts` para refrescar la sesión en cada request (patrón oficial `@supabase/ssr`).
- Smoke test: encender el flag temporalmente, verificar que el login funciona y que un segundo usuario no ve los items del primero, apagarlo de nuevo.

**Dependencias:** Fase 4.

---

## Fase 11 — Despliegue

**Objetivo:** producto público en una URL.

**Responsabilidades:**
- Conectar el repo a Vercel.
- Configurar variables de entorno en Vercel (mismas de `.env.example`, recordando que `SUPABASE_SERVICE_ROLE_KEY` solo va en server, nunca como `NEXT_PUBLIC_*`).
- Verificar conectividad Vercel → Supabase en producción (cookies de sesión, dominios autorizados en Supabase Auth).
- Verificar que las políticas RLS siguen activas y que el smoke test desde producción solo ve los items propios.
- Pulir metadata, favicon (un pétalo discreto), título.

**Dependencias:** todas las anteriores.

---

## Resumen de dependencias

```
0 → 0.5 → 1 → 2 → 3 → 4 → 5 (MVP)
                      4 → 6 → 7
                      4 → 8
                      4 → 10
                  2,5 → 9
              todas → 11
```

Las fases 6, 7, 8, 9 y 10 pueden abordarse en cualquier orden tras la 5, según prioridad.
