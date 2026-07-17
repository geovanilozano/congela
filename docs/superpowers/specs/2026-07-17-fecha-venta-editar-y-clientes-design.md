# Diseño: fecha de venta editable, editar venta y gestión de clientes

**Fecha:** 2026-07-17

## Contexto

Hoy una venta siempre se guarda con la fecha del momento en que se registra (no se
puede fechar en el pasado), no se puede editar una vez creada, y los clientes se crean
automáticamente con solo el nombre (sin teléfono/cédula/correo ni una sección para
gestionarlos). Este diseño cubre dos mejoras pedidas por el dueño.

## Feature 1 — Ventas: fecha editable y editar venta

### Formulario (`src/app/ventas/page.tsx`)
- Nuevo campo **Fecha** (`<input type="date">`), por defecto el día de hoy (hora local
  de Colombia). Permite fechar la venta en el pasado.
- **Modo edición:** con `?editar=<id>` el formulario se precarga con esa venta y su
  botón pasa a "Guardar cambios"; incluye un `<input hidden name="id">` y un enlace
  **Cancelar** (vuelve a `/ventas`). Sin `?editar`, el formulario crea como hoy.
- Cada fila de la tabla de ventas gana un enlace **Editar** (`/ventas?editar=<id>`),
  visible solo para ventas no cerradas en caja.

### Acciones (`src/app/ventas/actions.ts`)
- `crearVenta`: leer la fecha con `fechaLocalODefecto(formData.get("fecha"))` y guardarla
  en `venta.fecha`. El resto igual.
- **`actualizarVenta` (nueva):** actualiza fecha, cliente, forma de pago y el único ítem
  (descripción, cantidad, precio); recalcula `totalCents`. Reglas:
  - Si la venta tiene `cierreId` (ya cerrada en caja) → no hacer nada (no se edita).
  - `pagada`: si `formaPago === "contado"` → `pagada = true`. Si `credito` → conservar el
    valor actual de `pagada` (no reabrir un fiado ya cobrado).
  - Reutiliza la misma lógica de buscar-o-crear cliente por nombre que `crearVenta`.
  - Guard: `exigirRol("dueno", "cajero")`.

### Regla de seguridad
No se puede editar ni borrar una venta con `cierreId` (ya repartida en fondos), para no
descuadrar la caja. Ya aplica a borrar; se extiende a editar.

## Feature 2 — Clientes: registro completo y autocompletar

### Base de datos (`prisma/schema.prisma`, modelo `Cliente`)
Agregar dos columnas **opcionales**:
```
cedula String?
correo String?
```
(Ya existen `nombre` obligatorio, `telefono String?` y `tipo`.) Cambio aditivo: se aplica
con `prisma db push` en el deploy, sin pérdida de datos.

### Acciones (`src/app/clientes/actions.ts`, archivo nuevo)
- `crearCliente`: `nombre` obligatorio (si viene vacío, no crea); `telefono`, `cedula`,
  `correo` opcionales (se guardan como `null` si vacíos).
- `actualizarCliente`: actualiza los cuatro campos de un cliente por `id`.
- Guard en ambas: `exigirRol("dueno", "cajero")` (clientes es accesible a cajero y dueño).
- No se incluye borrar cliente (no pedido; además un cliente con ventas no debe borrarse).

### Sección Clientes (`src/app/clientes/page.tsx`)
- Formulario arriba para **crear**; con `?editar=<id>` se precarga para **editar** (patrón
  igual al de otros módulos). Campos: nombre (obligatorio), teléfono, cédula, correo.
- Cada tarjeta de cliente muestra sus datos (teléfono, cédula, correo si existen) y un
  botón **Editar**.
- Se conserva debajo el resumen actual de cuentas por cobrar.

### Autocompletar cliente en la venta
- En `ventas/page.tsx`, el `<input name="clienteNombre">` usa un `<datalist>` con los
  nombres de los clientes registrados (autocompletado nativo del navegador, sin JS).
- `crearVenta`/`actualizarVenta` ya hacen buscar-o-crear por nombre: elegir uno existente
  liga la venta a ese cliente; escribir uno nuevo lo crea con solo el nombre.

## Fuera de alcance (YAGNI)
- Borrar clientes.
- Mostrar cédula/teléfono dentro de la factura impresa (se puede agregar después).
- Varios ítems por venta (se mantiene un ítem por venta, como hoy).

## Archivos afectados
- `prisma/schema.prisma` — 2 campos en `Cliente`.
- `src/app/ventas/actions.ts` — `crearVenta` (fecha) + `actualizarVenta` (nueva).
- `src/app/ventas/page.tsx` — campo fecha, modo edición, datalist, enlace Editar.
- `src/app/clientes/actions.ts` — nuevo (crear/actualizar cliente).
- `src/app/clientes/page.tsx` — formulario crear/editar + mostrar campos.
