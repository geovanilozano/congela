# Núcleo Financiero — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App web local-first para controlar inversión, crédito (con amortización), reparto automático del dinero en fondos, ventas y cierre de caja, con un tablero financiero.

**Architecture:** Next.js (App Router) full-stack. Base de datos SQLite vía Prisma (migrable a PostgreSQL/Supabase después). La lógica financiera pura (amortización y reparto de fondos) vive en módulos aislados y probados con Vitest, independientes de la UI y la base de datos. Las pantallas consumen esa lógica a través de rutas de servidor (Server Actions / route handlers).

**Tech Stack:** Next.js 15 + TypeScript, Prisma + SQLite, Tailwind CSS, Recharts, Vitest.

---

## Estructura de archivos (Fase 0 + Fase 1)

```
Congela/
  prisma/
    schema.prisma            # modelo de datos
  src/
    lib/
      finance/
        amortizacion.ts      # cálculo de tabla de amortización (puro)
        fondos.ts            # motor de reparto de ingresos en fondos (puro)
        money.ts             # utilidades de dinero (redondeo a centavos)
      db.ts                  # cliente Prisma
    app/
      layout.tsx
      page.tsx               # tablero (dashboard)
      inversion/page.tsx
      credito/page.tsx
      fondos/page.tsx
      ventas/page.tsx
      caja/page.tsx
      api/...                # route handlers según se necesiten
  test/
    amortizacion.test.ts
    fondos.test.ts
```

**Responsabilidad de cada unidad:**
- `lib/finance/amortizacion.ts` — dado (monto, tasa, nº cuotas) devuelve la tabla de cuotas. Sin dependencias de DB/UI.
- `lib/finance/fondos.ts` — dado un ingreso y las reglas de reparto, devuelve cuánto va a cada fondo. Sin dependencias de DB/UI.
- `lib/finance/money.ts` — manejo de dinero en centavos (enteros) para evitar errores de redondeo.
- `lib/db.ts` — única puerta a la base de datos.
- `app/*` — pantallas; no contienen lógica financiera, la importan.

---

## Task 1: Scaffold del proyecto Next.js

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Crear la app**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint --no-turbopack --use-npm --yes
```
Expected: proyecto creado en el directorio actual.

- [ ] **Step 2: Verificar que arranca**

Run: `npm run dev` (Ctrl+C tras confirmar)
Expected: servidor en http://localhost:3000 sin errores.

- [ ] **Step 3: Commit**

```bash
git init && git add -A && git commit -m "chore: scaffold Next.js app"
```

---

## Task 2: Instalar Prisma, Vitest y Recharts

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`, `prisma/schema.prisma`, `.env`

- [ ] **Step 1: Instalar dependencias**

```bash
npm install prisma @prisma/client recharts
npm install -D vitest
npx prisma init --datasource-provider sqlite
```

- [ ] **Step 2: Configurar Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node", include: ["test/**/*.test.ts"] } });
```
Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: add prisma, vitest, recharts"
```

---

## Task 3: Utilidad de dinero (money.ts) — TDD

Dinero en **centavos enteros** para no perder precisión.

**Files:**
- Create: `src/lib/finance/money.ts`, `test/money.test.ts`

- [ ] **Step 1: Test que falla**

```ts
// test/money.test.ts
import { describe, it, expect } from "vitest";
import { toCents, fromCents, round2 } from "../src/lib/finance/money";

describe("money", () => {
  it("convierte pesos a centavos", () => {
    expect(toCents(1234.56)).toBe(123456);
  });
  it("convierte centavos a pesos", () => {
    expect(fromCents(123456)).toBe(1234.56);
  });
  it("redondea a 2 decimales", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npm test -- money`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

```ts
// src/lib/finance/money.ts
export const toCents = (pesos: number): number => Math.round(pesos * 100);
export const fromCents = (cents: number): number => cents / 100;
export const round2 = (n: number): number => Math.round(n * 100) / 100;
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npm test -- money`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: money utilities in cents"
```

---

## Task 4: Cálculo de amortización del crédito — TDD

Sistema de cuota fija (francés). Cada cuota se divide en interés (saldo × tasa) y capital
(cuota − interés). La última cuota ajusta el redondeo para dejar saldo exacto en 0.

**Files:**
- Create: `src/lib/finance/amortizacion.ts`, `test/amortizacion.test.ts`

- [ ] **Step 1: Test que falla**

```ts
// test/amortizacion.test.ts
import { describe, it, expect } from "vitest";
import { generarAmortizacion } from "../src/lib/finance/amortizacion";

describe("generarAmortizacion", () => {
  it("genera N cuotas y deja saldo final en 0", () => {
    const tabla = generarAmortizacion({ montoCents: 1_000_000, tasaMensual: 0.02, numCuotas: 12 });
    expect(tabla).toHaveLength(12);
    expect(tabla[11].saldoCents).toBe(0);
  });
  it("la primera cuota tiene el mayor interés", () => {
    const tabla = generarAmortizacion({ montoCents: 1_000_000, tasaMensual: 0.02, numCuotas: 12 });
    expect(tabla[0].interesCents).toBeGreaterThan(tabla[11].interesCents);
  });
  it("la suma de capital equivale al monto prestado", () => {
    const tabla = generarAmortizacion({ montoCents: 1_000_000, tasaMensual: 0.02, numCuotas: 12 });
    const sumaCapital = tabla.reduce((a, c) => a + c.capitalCents, 0);
    expect(sumaCapital).toBe(1_000_000);
  });
  it("tasa 0 reparte el capital en partes iguales sin interés", () => {
    const tabla = generarAmortizacion({ montoCents: 1_200, tasaMensual: 0, numCuotas: 12 });
    expect(tabla[0].interesCents).toBe(0);
    expect(tabla[0].capitalCents).toBe(100);
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npm test -- amortizacion`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

```ts
// src/lib/finance/amortizacion.ts
export interface Cuota {
  numero: number;
  cuotaCents: number;
  interesCents: number;
  capitalCents: number;
  saldoCents: number;
}
export interface ParamsCredito {
  montoCents: number;
  tasaMensual: number; // ej. 0.02 = 2% mensual
  numCuotas: number;
}

export function generarAmortizacion({ montoCents, tasaMensual, numCuotas }: ParamsCredito): Cuota[] {
  const cuotas: Cuota[] = [];
  const i = tasaMensual;
  const cuotaCents =
    i === 0
      ? Math.round(montoCents / numCuotas)
      : Math.round((montoCents * i) / (1 - Math.pow(1 + i, -numCuotas)));
  let saldo = montoCents;
  for (let n = 1; n <= numCuotas; n++) {
    const interes = Math.round(saldo * i);
    let capital = cuotaCents - interes;
    if (n === numCuotas) capital = saldo; // última cuota ajusta el redondeo
    saldo -= capital;
    cuotas.push({
      numero: n,
      cuotaCents: n === numCuotas ? capital + interes : cuotaCents,
      interesCents: interes,
      capitalCents: capital,
      saldoCents: saldo,
    });
  }
  return cuotas;
}
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npm test -- amortizacion`
Expected: PASS (4 pruebas).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: credit amortization calculator"
```

---

## Task 5: Motor de reparto de fondos — TDD

Reparte un ingreso entre fondos según reglas ordenadas por prioridad. Reglas de tipo
`fijo` toman su monto (o lo que quede si no alcanza); las de tipo `porcentaje` toman un %
del ingreso original; el fondo marcado `resto` recibe lo que sobra (la utilidad).

**Files:**
- Create: `src/lib/finance/fondos.ts`, `test/fondos.test.ts`

- [ ] **Step 1: Test que falla**

```ts
// test/fondos.test.ts
import { describe, it, expect } from "vitest";
import { repartir, ReglaFondo } from "../src/lib/finance/fondos";

const reglas: ReglaFondo[] = [
  { fondo: "arriendo", tipo: "fijo", valorCents: 30_000, prioridad: 1, activo: true },
  { fondo: "credito", tipo: "fijo", valorCents: 20_000, prioridad: 2, activo: true },
  { fondo: "reserva", tipo: "porcentaje", valor: 0.1, prioridad: 3, activo: true },
  { fondo: "utilidad", tipo: "resto", prioridad: 99, activo: true },
];

describe("repartir", () => {
  it("aparta fijos, porcentaje y deja el resto en utilidad", () => {
    const r = repartir(100_000, reglas);
    expect(r.arriendo).toBe(30_000);
    expect(r.credito).toBe(20_000);
    expect(r.reserva).toBe(10_000); // 10% de 100.000
    expect(r.utilidad).toBe(40_000); // lo que sobra
  });
  it("la suma repartida es igual al ingreso", () => {
    const r = repartir(100_000, reglas);
    const suma = Object.values(r).reduce((a, b) => a + b, 0);
    expect(suma).toBe(100_000);
  });
  it("si un fondo fijo está inactivo (credito pagado), su dinero pasa al resto", () => {
    const reglasPagado = reglas.map((x) => (x.fondo === "credito" ? { ...x, activo: false } : x));
    const r = repartir(100_000, reglasPagado);
    expect(r.credito ?? 0).toBe(0);
    expect(r.utilidad).toBe(60_000); // los 20.000 del crédito ahora son utilidad
  });
  it("si el ingreso no alcanza, los fijos toman lo disponible por prioridad", () => {
    const r = repartir(25_000, reglas);
    expect(r.arriendo).toBe(25_000);
    expect(r.credito ?? 0).toBe(0);
    expect(r.utilidad ?? 0).toBe(0);
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npm test -- fondos`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

```ts
// src/lib/finance/fondos.ts
export type TipoRegla = "fijo" | "porcentaje" | "resto";
export interface ReglaFondo {
  fondo: string;
  tipo: TipoRegla;
  valorCents?: number; // para "fijo"
  valor?: number;      // para "porcentaje" (0.1 = 10%)
  prioridad: number;
  activo: boolean;
}
export type Reparto = Record<string, number>;

export function repartir(ingresoCents: number, reglas: ReglaFondo[]): Reparto {
  const activas = reglas.filter((r) => r.activo).sort((a, b) => a.prioridad - b.prioridad);
  const reparto: Reparto = {};
  let restante = ingresoCents;
  for (const r of activas) {
    if (r.tipo === "resto") continue;
    let monto = 0;
    if (r.tipo === "fijo") monto = Math.min(r.valorCents ?? 0, restante);
    else if (r.tipo === "porcentaje") monto = Math.min(Math.round(ingresoCents * (r.valor ?? 0)), restante);
    reparto[r.fondo] = monto;
    restante -= monto;
  }
  const resto = activas.find((r) => r.tipo === "resto");
  if (resto) reparto[resto.fondo] = restante;
  return reparto;
}
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npm test -- fondos`
Expected: PASS (4 pruebas).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: fund distribution engine"
```

---

## Task 6: Modelo de datos (Prisma schema)

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Definir modelos**

Modelos: `Inversion`, `Credito`, `CuotaAmortizacion`, `PagoCredito`, `Fondo`,
`ReglaReparto`, `MovimientoFondo`, `Cliente`, `Venta`, `VentaItem`, `CierreCaja`.
(Campos según sección 5 de PLAN.md; montos en `Int` = centavos; fechas `DateTime`.)

- [ ] **Step 2: Crear la base de datos**

Run: `npx prisma migrate dev --name init`
Expected: se crea `prisma/dev.db` y el cliente Prisma.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: database schema for financial core"
```

---

## Task 7: Pantalla Crédito (registrar crédito + ver amortización)

**Files:**
- Create: `src/app/credito/page.tsx`, server action para guardar crédito
- Uses: `generarAmortizacion` (Task 4)

- [ ] Formulario: monto, tasa mensual, nº de cuotas, fecha inicio, entidad.
- [ ] Al guardar: generar tabla con `generarAmortizacion`, persistir crédito + cuotas.
- [ ] Mostrar tabla de amortización, saldo pendiente, total intereses, % avance.
- [ ] Registrar pago de cuota (marcar pagada, adjuntar comprobante — foto).
- [ ] Commit.

---

## Task 8: Pantalla Fondos (configurar reglas de reparto)

**Files:**
- Create: `src/app/fondos/page.tsx`
- Uses: `repartir` (Task 5)

- [ ] Listar fondos (Arriendo, Crédito, Operación, Reserva, Utilidad, Reinversión).
- [ ] Editar regla de cada fondo (fijo / porcentaje / resto, valor, prioridad, activo).
- [ ] Mostrar saldo acumulado de cada fondo.
- [ ] Commit.

---

## Task 9: Pantalla Ventas + Cierre de Caja (dispara el reparto)

**Files:**
- Create: `src/app/ventas/page.tsx`, `src/app/caja/page.tsx`
- Uses: `repartir` (Task 5)

- [ ] Crear venta (cliente, productos, cantidad, precio, forma de pago).
- [ ] Cierre de caja diario: suma ventas del día, aplica `repartir`, crea `MovimientoFondo` por fondo.
- [ ] Commit.

---

## Task 10: Regla automática "crédito pagado"

**Files:**
- Modify: lógica de pago de cuota (Task 7)

- [ ] Al registrar el pago que deja el saldo del crédito en 0: marcar crédito PAGADO.
- [ ] Desactivar la `ReglaReparto` del fondo "Crédito" (`activo=false`) → su dinero pasa al resto (utilidad).
- [ ] Mostrar aviso y comparación de utilidad antes/después.
- [ ] Commit.

---

## Task 11: Pantalla Inversión inicial

**Files:**
- Create: `src/app/inversion/page.tsx`

- [ ] Registrar rubros (descripción, proveedor, valor, fecha, contado/crédito, foto factura).
- [ ] Total invertido; vincular con crédito si aplica.
- [ ] Commit.

---

## Task 12: Tablero financiero (dashboard)

**Files:**
- Modify: `src/app/page.tsx`
- Uses: Recharts

- [ ] Tarjetas: ingresos del mes, utilidad, saldo del crédito, % avance, saldo de cada fondo.
- [ ] Gráfico de ingresos vs gastos; gráfico de avance del crédito.
- [ ] Commit.

---

## Self-Review (cobertura vs PLAN.md Fase 1)

- Inversión inicial → Task 11 ✅
- Crédito + amortización → Task 4, 7 ✅
- Pagos de cuota + alertas → Task 7 ✅
- Fondos (reglas de reparto) → Task 5, 8 ✅
- Ventas y facturación → Task 9 ✅
- Cierre de caja que reparte → Task 9 ✅
- Regla automática al saldar crédito → Task 10 ✅
- Tablero financiero → Task 12 ✅

Fases 2–5 (energía, operación, personal, reportes avanzados) tienen su propio plan más adelante.
