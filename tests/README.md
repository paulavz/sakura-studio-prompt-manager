# Tests — Sakura Prompt Studio

Guía rápida de la suite de tests del proyecto: qué hay, en qué orden correrlos y por qué.

> **Regla de oro (lee esto primero):** durante diagnóstico, **siempre corre un solo test a la vez** — nunca el archivo completo, nunca el set entero. El set completo es solo para regresión final. Más detalle en `phases/test-fixes/00-INDEX.md`.

---

## Tipos de tests

El proyecto tiene **tres familias** de tests, en orden creciente de costo y blast radius:

### 1. Auditoría estática + DOM ligera (Python / pytest)

**Archivo:** `tests/test_phase9_audit.py` (4 tests).

Escanea código fuente y arranca la app una vez para chequear contratos básicos:
- Que `#FFB7C5` no esté hardcodeado fuera de `globals.css` / `tailwind.config.ts`.
- Que ningún componente use colores arbitrarios de Tailwind (`bg-[#...]`).
- Que existan los `data-region` (`sidebar`, `gallery`, `viewer`, `layout-root`).
- Que la fuente body incluya Inter.

**Cuándo corre:** primero. Es el más rápido y atrapa violaciones de tokens antes de gastar tiempo en visuales.

### 2. E2E funcionales (Python / pytest + Playwright sync)

**Archivos:** `tests/test_phase4.py` … `tests/test_phase8.py` (≈148 tests en total).

Cubre features por fase histórica:
| Archivo | Foco | # tests |
|---|---|---|
| `test_phase4.py` | Editor / variables `{{ }}` / drawer | 30 |
| `test_phase5.py` | Drawer + reemplazo + copia | 30 |
| `test_phase6.py` | Skills inyectables | 22 |
| `test_phase7.py` | Asignación de agente | 33 |
| `test_phase8.py` | Gestión de tags (CRUD, validación) | 33 |

Cada test arranca su propio navegador y deja la DB limpia al terminar (ver `conftest.py` — fixture `cleanup_after_each_test` corre `cleanup_all()` después de cada función).

### 3. Visuales (TypeScript / Playwright Test)

**Carpeta:** `tests/visual/` (≈18 tests).

Dos sub-categorías dentro del directorio visual:
- **Visual regression** — screenshot vs. baseline (`mockup-*.png`).
- **DOM contract** — `toHaveCSS`, `expectColorToken`, `data-region` selectors, sin pixel-diff.

| Spec | Contenido |
|---|---|
| `three-pane-layout.spec.ts` | Layout 3 columnas, separadores, no scroll horizontal, no `#FFB7C5` inline (5 tests) |
| `sidebar.spec.ts` | Sidebar — ancho fijo, branding, color sakura en título (3 tests) |
| `gallery-cards.spec.ts` | Card — border 1px, indicador 🌸, baseline (3 tests) |
| `viewer.spec.ts` | Viewer — toggle rendered/raw, fonts Inter + JetBrains Mono, baseline (4 tests) |
| `variable-chips.spec.ts` | Chips de variables — sakura 20%/50%, custom property (4 tests) |
| `tag-chips.spec.ts` | Tag chips — fondo neutral (NO sakura), radius (2 tests) |

Globalmente: `globalSetup` siembra Supabase (`tests/visual/helpers/seed.ts`), `globalTeardown` limpia (`teardown.ts`).

---

## Orden recomendado de ejecución

De más barato y de mayor cobertura amplia → a más caro y específico:

1. **Auditoría** (`test_phase9_audit.py`) — segundos.
2. **Visuales DOM-only por fase** (ver `phases/test-fixes/`):
   1. `three-pane-layout`
   2. `sidebar`
   3. `gallery-cards`
   4. `viewer`
   5. `variable-chips`
   6. `tag-chips`
3. **E2E funcionales por fase histórica** (`test_phase4` → `test_phase8`).
4. **Regresión final completa** (`npx playwright test` + `pytest tests/`).

Esta es la cadena de menor blast radius primero: si la auditoría falla, los visuales y los E2E también van a fallar — fixéalo arriba antes de bajar.

---

## Cómo correr — comandos por tipo

### Pre-requisitos (una vez por sesión)

```powershell
# Levantar el dev server (Playwright reusa el que esté en :3000)
npm run dev

# Asegurar variables de entorno
# .env.local debe tener:
#   NEXT_PUBLIC_SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY
#   NEXT_PUBLIC_V1_USER_UUID
#   BASE_URL=http://localhost:3000   # para los tests Python
```

### 1. Auditoría

```powershell
# Solo la auditoría
pytest tests/test_phase9_audit.py -v

# Un test individual
pytest tests/test_phase9_audit.py::test_no_hardcoded_sakura -v
```

### 2. Visuales (recomendado: usar los scripts por archivo)

```powershell
# Set completo — SOLO regresión final
npm run test:visual

# Por archivo (regresión de fase)
npm run test:visual:three-pane-layout
npm run test:visual:sidebar
npm run test:visual:gallery-cards
npm run test:visual:viewer
npm run test:visual:variable-chips
npm run test:visual:tag-chips

# Un test individual — usa esto durante diagnóstico
npx playwright test -g "exact test title"
npx playwright test tests/visual/sidebar.spec.ts:11   # por file:line

# Actualizar baseline de UN test (verificar contra design/Sakura Prompt Studio _standalone_.html antes)
npx playwright test -g "exact title" --update-snapshots
```

### 3. E2E funcionales (Python)

```powershell
# Todos los E2E
pytest tests/test_phase4.py tests/test_phase5.py tests/test_phase6.py tests/test_phase7.py tests/test_phase8.py

# Por fase (regresión)
pytest tests/test_phase7.py -v

# Un test individual — usa esto durante diagnóstico
pytest tests/test_phase7.py::test_assign_agent_button_visible -v

# Una palabra clave en el nombre
pytest tests/test_phase8.py -k "rename" -v
```

### 4. Regresión final (todo)

```powershell
pytest tests/test_phase9_audit.py
pytest tests/test_phase4.py tests/test_phase5.py tests/test_phase6.py tests/test_phase7.py tests/test_phase8.py
npx playwright test
```

Si cualquiera falla, **no re-corras el set completo**. Vuelve a aislar el test fallido. Ver `phases/test-fixes/07-final-regression.md`.

---

## Seed y limpieza de la DB

### Python (E2E)

`tests/conftest.py` registra `cleanup_after_each_test` como fixture autouse → cada test termina con `cleanup_all()` (definido en `tests/cleanup_db.py`). No requiere acción manual.

Si un test necesita filas pre-existentes, las crea en su propio cuerpo (no hay seed global para Python).

### Playwright (visuales)

- **Set completo:** `globalSetup` (en `playwright.config.ts`) llama a `seed()` antes del primer test; `globalTeardown` llama a `cleanup()` después del último. Datos en `tests/visual/helpers/seed.ts` (3 items + 3 tags, UUIDs fijos, `upsert` idempotente).
- **Test individual:** si el test depende de filas seeded y lo corres aislado, el global setup puede no dispararse según cómo invoques Playwright. En ese caso, envuelve el test:

  ```ts
  import { seed, cleanup } from "./helpers/seed";

  test("nombre", async ({ page }) => {
    await seed();
    try {
      // … cuerpo del test …
    } finally {
      await cleanup();
    }
  });
  ```

  O a nivel describe con `test.beforeAll(seed)` / `test.afterAll(cleanup)`. Es idempotente — funciona aunque el global setup también haya corrido.

---

## Estructura de carpetas

```
tests/
├── README.md                       ← este archivo
├── conftest.py                     ← fixtures pytest (cleanup autouse, page)
├── cleanup_db.py                   ← cleanup_all() compartido
├── run_tests.py                    ← runners legacy (uso opcional)
├── run_tests_phase5.py
├── run_tests_phase6.py
├── run_tests_phase7.py
├── test_phase4.py                  ← E2E
├── test_phase5.py                  ← E2E
├── test_phase6.py                  ← E2E
├── test_phase7.py                  ← E2E
├── test_phase8.py                  ← E2E
├── test_phase9_audit.py            ← auditoría estática + DOM
└── visual/                         ← Playwright TS
    ├── dom-audit.mjs               ← script auxiliar (no spec)
    ├── gallery-cards.spec.ts
    ├── sidebar.spec.ts
    ├── tag-chips.spec.ts
    ├── three-pane-layout.spec.ts
    ├── variable-chips.spec.ts
    ├── viewer.spec.ts
    ├── *.spec.ts-snapshots/        ← baselines PNG por test
    └── helpers/
        ├── compare-to-baseline.ts
        ├── computed-style.ts        ← expectColorToken, expectFontFamily, …
        ├── mockup-compare.ts
        ├── regions.ts               ← selectores REGIONS + MOCKUP_VALUES
        ├── seed.ts                  ← seed() + cleanup() + globalSetup
        └── teardown.ts              ← globalTeardown
```

---

## Convenciones para fixear tests rápido

1. **Un test a la vez** durante diagnóstico. Nunca el archivo, nunca el set.
2. **Un archivo modificado a la vez** entre re-runs (bisect trivial si algo regresiona).
3. **Tests que necesitan seed → siembra al inicio del test, limpia al final** (`try/finally`).
4. **Baselines visuales:** solo `--update-snapshots` con `-g "..."`. Verificar contra `design/Sakura Prompt Studio _standalone_.html` antes de aceptar el cambio.
5. **Si una regresión aparece tras un fix:** vuelve a aislar el test regresionado, no entres en loop con el set completo.
6. **Reusar dev server:** mantén `npm run dev` corriendo en otra terminal — `playwright.config.ts` tiene `reuseExistingServer: true`, evita el cold start de Next en cada invocación.

Para el workflow detallado de fixes por fase, ver `phases/test-fixes/00-INDEX.md` y los planes `01-…` a `07-…`.
