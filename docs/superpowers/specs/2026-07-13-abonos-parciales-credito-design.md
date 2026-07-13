# Mejora: Abonos parciales al crédito

> Fecha: 2026-07-13. Hoy solo se puede "Registrar pago" de una cuota completa.
> En la vida real el dueño abona lo que tiene, o adelanta para terminar antes.

## Problema
`registrarPago` marca la cuota entera como pagada por su valor exacto. No admite pagar
menos (abono parcial) ni más (adelantar varias cuotas). El saldo deja de reflejar la
realidad si el dueño paga distinto a la cuota exacta.

## Modelo de datos (migración aditiva)
Se agrega a `CuotaAmortizacion`:
- `abonadoCents Int @default(0)` — cuánto se ha pagado de esa cuota.
Y un tercer estado: "pendiente" | "parcial" | "pagada" | "vencida".
Backfill: las cuotas ya "pagada" quedan con `abonadoCents = cuotaCents`.

## Lógica (pura, con test)
`distribuirAbono(cuotasPendientes, montoCents)` reparte un abono entre las cuotas de la
más vieja a la más nueva: llena cada una hasta su valor y pasa el resto a la siguiente.
Devuelve las actualizaciones (id, nuevoAbonado, pagada) y el sobrante si el abono supera
todo lo que falta.

## Comportamiento
- El formulario de pago pide un **monto** (por defecto, el valor de la próxima cuota).
- Se reparte con `distribuirAbono`, se actualizan las cuotas y se registra un PagoCredito.
- Si con eso quedan todas pagadas, el crédito se marca PAGADO y el fondo "Crédito" se
  desactiva (regla que ya existe).

## Presentación
- "Total pagado" = suma de lo abonado en todas las cuotas.
- "Saldo pendiente" = lo que falta por pagar = suma de (cuota − abonado). Es el número
  intuitivo para el dueño ("cuánto debo").
- Cada cuota muestra su estado y, si es parcial, cuánto lleva abonado.

## Respaldo
`abonadoCents` es entero; el respaldo y la restauración lo manejan sin cambios.
