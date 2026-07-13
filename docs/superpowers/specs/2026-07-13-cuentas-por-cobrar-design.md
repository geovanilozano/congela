# Mejora: Cuentas por cobrar (clientes + pago del fiado)

> Fecha: 2026-07-13. El negocio vende a crédito (fiado) a tiendas y restaurantes.
> El dueño necesita ver "quién me debe cuánto" y marcar cuándo le pagan.

## Decisión del dueño
El fiado **entra al cierre de caja de una vez** (como hoy). "Registrar pago del cliente"
es solo contabilidad: cierra la deuda en la lista de cuentas por cobrar y NO vuelve a
mover dinero (ya se repartió en el cierre). No se cambia el flujo de dinero actual.

## Modelo de datos (migración aditiva)
Se agregan dos campos a `Venta`:
- `pagada Boolean @default(false)` — si el cliente ya pagó esa venta.
- `pagadaEn DateTime?` — cuándo pagó.

Backfill en la migración: `UPDATE Venta SET pagada = 1 WHERE formaPago = 'contado'`
(el contado siempre está pagado; el crédito existente queda por cobrar).

## Comportamiento
- `crearVenta`: `pagada = (formaPago === "contado")`. Una venta de contado nace pagada;
  una a crédito nace por cobrar.
- `registrarPagoCliente(ventaId)`: si la venta es a crédito y no está pagada, la marca
  pagada con la fecha de hoy. Solo contabilidad, no toca fondos.

## Pantalla nueva: /clientes
- Resumen arriba: **total por cobrar** (suma de ventas a crédito no pagadas).
- Por cada cliente: total comprado, cuánto debe (por cobrar) y su lista de ventas a
  crédito pendientes, cada una con botón "marcar pagada". Ordenado por quién debe más.
- Enlace en el menú (Finanzas). Acceso: dueño y cajero (manejan ventas y cobros).

## Lógica pura (con test)
`resumenClientes(clientes, ventas)` en `src/lib/clientes.ts`: agrupa por cliente y calcula
total comprado y por cobrar. Se prueba aislada.

## Respaldo
`pagadaEn` se agrega a los campos de fecha que la restauración reconvierte.

## Fuera de alcance
Abonos parciales de una misma venta (una venta a crédito se marca pagada completa).
