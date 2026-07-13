# Mejora: Confianza en los datos

> Fecha: 2026-07-13. Objetivo: que ningún número del negocio entre mal en silencio.
> La app se usa sobre todo desde el celular, por gente no técnica.

## Problema

1. Una venta o gasto sin precio se guarda como $0 sin avisar (descuadra el cierre).
2. No hay confirmación visible de que algo se guardó (el usuario registra doble "por si acaso").
3. Los montos son `<input type="number">` crudos: escribir 15.000.000 en vez de 1.500.000
   es facilísimo y no hay ninguna señal visual.

## Alcance (3 piezas)

### A. Input de dinero con separador de miles (`InputDinero`)
- Componente cliente reutilizable. Muestra el valor formateado ("1.500.000") mientras
  se escribe y un eco "= $1.500.000" debajo.
- Un campo oculto con el `name` real lleva el número limpio ("1500000"), así los server
  actions lo leen sin cambios.
- Se apoya en dos funciones puras en `money.ts`: `formatMiles` y `parseMiles` (con test).
- Se aplica primero a los formularios de más uso: ventas, gastos, crédito, inversión.

### B. Validación con aviso
- `crearVenta` rechaza precio ≤ 0 o cantidad ≤ 0 → `redirect("/ventas?error=precio")`.
- `crearCompra` / `actualizarCompra` rechazan valor ≤ 0 → `/compras?error=valor`.
- `crearCredito` rechaza monto ≤ 0 → `/credito?error=monto` (hoy hace `return` mudo).
- Cada página muestra un aviso ámbar según el query param (patrón ya usado en `caja?error=sinResto`).

### C. Confirmación de guardado
- Tras un registro correcto, `redirect("/ventas?ok=1")` (y equivalente en gastos).
- La página muestra un aviso verde "✓ Registrado". Desaparece al navegar (vive en el query).

## Por qué así
- El patrón de feedback por query param ya existe en la app y no obliga a reescribir las
  páginas a client components: mínimo riesgo, máxima consistencia.
- Las funciones puras de formateo se prueban aisladas (TDD); el componente solo las usa.

## Fuera de alcance (otras rondas)
Restaurar respaldo, anular cierre, abonos parciales, tendencias, clientes, paginación.
