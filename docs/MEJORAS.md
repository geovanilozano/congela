# Plan de mejora de la plataforma Congela

> Fecha: 2026-07-12. Se ejecuta con varios agentes en paralelo, en la rama
> `mejoras-plataforma`. Todo es reversible (git).

## Principio

Este plan de mejora **no cambia la base de datos** (sin migraciones): usa el modelo
de datos actual. Son mejoras de experiencia de uso y funciones que faltaban. Así es
seguro ejecutarlo mientras cargas tus datos reales.

## Mejoras que se ejecutan automáticamente

### A. Piezas compartidas (base)
- **Botón de eliminar con confirmación**: hoy cualquier "Eliminar" borra al instante.
  Se agrega una confirmación ("¿Seguro?") para evitar borrados accidentales.
- **Filtro por rango de fecha** (desde/hasta) reutilizable para los listados.
- **Página de Ajustes**:
  - Botón para **borrar los datos de demostración** y empezar limpio.
  - **Exportar respaldo** de toda la información.
- Enlace a "Ajustes" en el menú.

### B. Por cada módulo (en paralelo)
Para inversión, activos, ventas, gastos, producción, inventario, personal,
mantenimiento y servicios:
- **Editar registros** (hoy solo se puede crear y borrar; se agrega editar).
- **Confirmación al borrar** (usa el botón nuevo).
- **Filtro por fecha** en los listados que tienen fecha (ventas, gastos, producción,
  mantenimiento, servicios) y en **Reportes**.

### C. Verificación
- Compilar (`npm run build`) y correr las pruebas (`npm test`); corregir lo que falle.

## Mejoras que NO se ejecutan aún (necesitan tu decisión)

- **Inicio de sesión con roles** (dueño / cajero / operario): es un cambio grande y
  sensible de seguridad; conviene decidir cómo lo quieres antes.
- **Conexión automática al inversor solar**: falta que confirmes la marca.
- **Exportar reportes a PDF** y **leer facturas por foto (OCR)**: útiles pero opcionales.

## Reglas para la ejecución en paralelo (evitar conflictos)

- Cada agente de módulo modifica **solo** los archivos de su módulo
  (`src/app/<modulo>/page.tsx` y `actions.ts`). No toca `Nav.tsx`, `schema.prisma`
  ni otros módulos.
- Las piezas compartidas (botón, filtro, ajustes, `Nav.tsx`) las hace **un solo**
  agente antes que los demás.
- Nadie modifica el modelo de datos.
