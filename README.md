# Congela — Sistema de control para venta de hielo

Aplicación web para administrar un negocio de producción y venta de hielo:
inversión, crédito, reparto del dinero, ventas, energía solar, operación,
personal y reportes financieros.

## Qué incluye

- **Núcleo financiero:** inversión inicial, crédito con tabla de amortización,
  reparto automático de cada ingreso en fondos (arriendo, cuota del crédito,
  operación, reserva, utilidad) y reasignación automática al pagar la deuda.
- **Ventas y caja:** facturas, clientes, formas de pago y cierre de caja diario.
- **Energía y servicios:** generación de paneles vs consumo, ahorro solar y
  recibos de energía, agua, gas e internet (con foto).
- **Operación:** activos y equipos, producción de hielo, inventario con alertas
  de stock bajo, compras y gastos (con foto de comprobante).
- **Personal y mantenimiento:** empleados, asistencia, pagos, producción por
  empleado y mantenimientos preventivos/correctivos con alertas.
- **Reportes:** recuperación de la inversión, costo real por bolsa, margen,
  punto de equilibrio, utilidad y exportación a Excel.

## Tecnología

- Next.js (React) + TypeScript
- Base de datos SQLite con Prisma (migrable a PostgreSQL)
- Tailwind CSS y Recharts
- Pruebas con Vitest

## Cómo ejecutarlo

```bash
# 1. Instalar dependencias (regenera el cliente de Prisma automáticamente)
npm install

# 2. Copiar la configuración de ejemplo
cp .env.example .env

# 3. Crear la base de datos local
npx prisma migrate dev

# 4. Iniciar la aplicación
npm run dev
```

Luego abrir http://localhost:3000

La primera vez, la app pide crear el usuario **Dueño** (el que ve y edita todo).

## Pruebas

```bash
npm test
```

## Antes de publicarlo en internet

- **`AUTH_SECRET` es obligatoria.** Es la clave con que se firman las sesiones. Si se
  deja la de ejemplo, cualquiera podría entrar como Dueño. Genera una con
  `openssl rand -base64 32`. En producción la app se niega a funcionar sin ella.
- Las **fotos de facturas** se guardan en la carpeta privada `archivos/` (no en `public/`)
  y se sirven por `/api/archivo`, que exige sesión. Esa carpeta hay que respaldarla junto
  con la base de datos.
- Las fechas se manejan en la **hora local del negocio**. Si el servidor queda en otra
  zona horaria, ponle `TZ=America/Bogota`.

## Estado del proyecto

Las 5 fases del plan (ver `PLAN.md`) están construidas, incluyendo login con roles,
exportar a PDF, OCR de facturas y conexión con Growatt. Pendiente opcional: alertas de
consumo/temperatura en vivo y publicación en internet.
