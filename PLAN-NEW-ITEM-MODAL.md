# Plan: reemplazar `/items/new` por modal de creación inline

## Contexto

Hoy, pulsar el botón **+** en la galería navega a `/items/new` — una página dedicada y fea que rompe el flujo (pierdes sidebar + galería, layout distinto al editor real). La usuaria quiere alinear creación con edición:

1. El botón **+** abre un **modal pequeño** sobre la galería pidiendo solo **título + categoría**.
2. Al pulsar **Create**, se inserta el item con `content=""`, el modal se cierra y la página principal se mantiene (sidebar + galería + viewer).
3. La prompt recién creada queda **seleccionada automáticamente** en el panel derecho (`ItemView`), lista para editar. Mismo UI que cuando se hace click en una card existente — no hay flujo dedicado de "creación".

Decisiones confirmadas con la usuaria:
- Comportamiento post-crear: **abrir seleccionada en la galería** (no navegar a `/items/[id]`).
- Trigger: **mismo botón + en el header de la galería** (no añadir acceso en sidebar).

## Archivos a modificar

### 1. `app/actions.ts`

Reemplazar `createItemAction` por una server action callable desde cliente que devuelva `{id?, error?}` en vez de redirigir. La firma actual (`(_prev, formData)`) viene de `useActionState` y dispara `redirect()` — no sirve para el flujo modal.

**Cambios concretos:**
- Renombrar `createItemAction` → `createItem`.
- Nueva firma: `createItem(title: string, category: string): Promise<{id?: string; error?: string}>`.
- Eliminar `import { redirect } from "next/navigation"` (deja de usarse).
- Mantener `revalidatePath("/")` para que la lista del server component se refresque.
- Devolver `{ id: data.id }` en éxito, `{ error: ... }` en fallo. Validaciones (título no vacío, categoría válida) iguales que ahora.

### 2. `components/new-item-modal.tsx` (nuevo)

Modal client component. Patrón visual y de animación: copiar `components/confirm-dialog.tsx` (backdrop `bg-black/10`, `framer-motion`, `rounded-lg border border-gray-200 bg-white p-6 shadow-lg`, posición `fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60]`). NO crear un nuevo estilo — heredar del existente para que case con el resto de la app.

**Props:**
```ts
{
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}
```

**Contenido del modal:**
- Título `"New prompt"`.
- Form con dos campos:
  - `title` — input text, autofocus al abrir, required.
  - `category` — select con `CATEGORIES` de `lib/database.types` (etiquetas vía `CATEGORY_LABELS`), default `"template"`.
- Mensaje de error inline si la server action devuelve `{error}`.
- Botones: `Cancel` (cierra) y `Create` (submit). Disabled mientras `pending` o `title.trim() === ""`.

**Comportamiento:**
- Al montarse abierto: resetear `title=""`, `category="template"`, `error=null`, `pending=false`, autofocus al input de título.
- Submit → `setPending(true)` → llamar `createItem(title, category)` → si `result.id` ejecutar `onCreated(result.id)`. Si error, mostrar y resetear `pending`. **No** cerrar el modal en `onCreated` desde dentro — el parent decide (suele cerrarlo después de actualizar selección).
- Escape cierra (salvo si `pending`). Click en backdrop cierra (salvo si `pending`).
- Sin persistencia local — modal puramente efímero.

### 3. `components/gallery.tsx`

Reemplazar el `<Link href="/items/new">` (líneas 91-97 aprox.) por un `<button>` que abre el modal, y montar `<NewItemModal>` al final del JSX.

**Cambios concretos:**
- Imports:
  - Quitar `import Link from "next/link"` (ya no se usa en este file — verificar que no haya otros usos antes de borrar).
  - Añadir `import { useRouter } from "next/navigation"`.
  - Añadir `import { NewItemModal } from "./new-item-modal"`.
- Dentro de `Gallery`:
  - `const router = useRouter();`
  - `const [newModalOpen, setNewModalOpen] = useState(false);`
- Reemplazar el `<Link href="/items/new" ...>+</Link>` por un `<button>` con las mismas clases visuales (`w-[28px] h-[28px] rounded-[var(--radius-sm)] border border-gray-200 ...`) y `onClick={() => setNewModalOpen(true)}`. Mantener `title="New prompt"`.
- Antes del cierre `</div>` raíz, montar:
  ```tsx
  <NewItemModal
    isOpen={newModalOpen}
    onClose={() => setNewModalOpen(false)}
    onCreated={(id) => {
      setNewModalOpen(false);
      setSelectedItemId(id);
      // also clear filters so the new item is visible in the gallery list
      setSelectedCategory("all");
      setSelectedSubcategory(null);
      setSearchQuery("");
      router.refresh();
    }}
  />
  ```
  Importante: limpiar filtros — si la usuaria estaba en "Favorites" o filtrada por subcategoría que el nuevo item no satisface, la card no aparecería en la lista aunque el viewer la mostrase.

**Nota sobre el refresh:** `router.refresh()` re-ejecuta el server component padre (`app/page.tsx`), que devuelve la lista actualizada de items como prop. Al cambiar la prop `items`, el `useMemo` de `selectedItem` (línea 42) lo resolverá vía `items.find(i => i.id === selectedItemId)` y `ItemView` se montará con el item nuevo. La key `key={selectedItem.id}` (línea 129) garantiza remount limpio.

### 4. Borrar `app/items/new/page.tsx`

Y borrar la carpeta `app/items/new/` si queda vacía. La ruta `/items/new` deja de existir; quien la teclee directo recibirá 404, lo cual es correcto.

## Consideraciones / loose ends

- **Tests E2E:** revisar `tests/e2e/` por specs que naveguen a `/items/new` o pulsen el botón + esperando navegación. Actualizar para esperar el modal y rellenarlo. Buscar con `grep "items/new"` en `tests/`.
- **`useRouter` en cliente:** ya hay otros componentes cliente; ningún problema, pero confirmar que `gallery.tsx` queda como `"use client"` (ya lo es).
- **Subcategory:** no se pide en el modal (mantenemos simple: solo título + categoría per la conversación). Si el item es `template`, queda con `subcategory=null`; se puede asignar luego desde el viewer (si esa UI existe) o vía edición.
- **Accesibilidad:** el modal debe atrapar foco (al menos autofocus al input de título y permitir Tab dentro). `confirm-dialog.tsx` no implementa focus trap completo — replicar ese nivel está bien para v1.
- **Diseño Sakura:** el botón **+** actual es neutro (`text-gray-400 hover:text-black`). Mantener exactamente igual; el rosa Sakura está reservado a los 6 usos enumerados en `CLAUDE.md` y la creación no es uno de ellos.

## Verificación

1. `npm run dev`.
2. Pulsar **+** en el header de la galería → aparece modal centrado con backdrop.
3. Escribir título, dejar categoría por defecto, click **Create**:
   - Modal se cierra.
   - La card nueva aparece en la lista de la galería (en "All Prompts", ordenada por `created_at DESC` debería estar primera).
   - El viewer derecho muestra `ItemView` con el item recién creado (título visible, content vacío, listo para editar en Tiptap).
4. Probar **Cancel** y **Escape** → modal se cierra sin crear.
5. Probar con título vacío → botón Create disabled.
6. Probar error de servidor (apagar Supabase) → mensaje rojo inline, modal no se cierra.
7. Confirmar que `/items/new` da 404.
8. Correr tests existentes: `npm test` (unit) + e2e relevantes. Ajustar specs que asuman la ruta vieja.

## Archivos críticos (referencia rápida)

- `app/actions.ts:22-58` — la action a transformar.
- `app/items/new/page.tsx` — a eliminar.
- `components/gallery.tsx:1-8, 91-97, 124-150` — imports, botón +, montaje del modal.
- `components/confirm-dialog.tsx` — patrón visual y de animación a copiar.
- `lib/database.types.ts` — `CATEGORIES`, `CATEGORY_LABELS`, `ItemCategory`.
- `app/page.tsx` — server component que provee `items`; no se toca, pero conviene saber que `router.refresh()` lo re-ejecuta.

## No-objetivos

- No tocar el flujo de edición (`ItemView`, `useItemState`, save).
- No añadir subcategoría al modal.
- No añadir validación de duplicados de título (no existía antes).
- No tocar la columna `applied_skills` ni el flow de skills (problema separado, ya arreglado).
