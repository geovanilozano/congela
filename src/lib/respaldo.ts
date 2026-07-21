// Restaurar un respaldo (JSON) hecho con /api/export?tipo=respaldo.
//
// Reemplaza TODOS los datos de operación por los del archivo. No toca los usuarios
// (para no perder el acceso) ni los secretos (que nunca se guardan en el respaldo).
// Va todo en una transacción: si algo falla, no se cambia nada.

/** Campos DateTime del esquema. En el JSON llegan como texto ISO y hay que revivirlos. */
const CAMPOS_FECHA = new Set([
  "createdAt", "fecha", "fechaCompra", "fechaIngreso", "fechaInicio",
  "fechaProgramada", "fechaRealizada", "fechaVencimiento", "garantiaHasta",
  "periodoFin", "periodoInicio", "pagadaEn",
  // Liquidaciones de medidores:
  "fechaAnterior", "fechaActual",
]);

type Fila = Record<string, unknown>;

// Claves de ajustes que NUNCA van en el respaldo (secretos). Se conservan al restaurar.
// Espejo de CLAVES_SECRETAS en @/lib/ajustes (se inlinea para no cargar Prisma en este
// módulo, que se prueba con funciones puras sin base de datos).
const CLAVES_SECRETAS: string[] = ["growattClave", "anthropicApiKey"];

/** Convierte los campos de fecha (texto ISO) de una fila en objetos Date. */
export function revivirFechas(fila: Fila): Fila {
  const salida: Fila = { ...fila };
  for (const campo of CAMPOS_FECHA) {
    const v = salida[campo];
    if (typeof v === "string" && v !== "") salida[campo] = new Date(v);
  }
  return salida;
}

/**
 * Orden de restauración: los padres antes que los hijos, para respetar las llaves
 * foráneas al insertar. `clave` es como viene la tabla en el JSON; `modelo` es el
 * delegado de Prisma. Para borrar se recorre al revés.
 */
export const ORDEN_RESTAURACION: { clave: string; modelo: string }[] = [
  { clave: "fondo", modelo: "fondo" },
  { clave: "reglaReparto", modelo: "reglaReparto" },
  { clave: "cierreCaja", modelo: "cierreCaja" },
  { clave: "credito", modelo: "credito" },
  { clave: "activo", modelo: "activo" },
  { clave: "inversion", modelo: "inversion" },
  { clave: "cuotaAmortizacion", modelo: "cuotaAmortizacion" },
  { clave: "pagoCredito", modelo: "pagoCredito" },
  { clave: "cliente", modelo: "cliente" },
  { clave: "venta", modelo: "venta" },
  { clave: "ventaItem", modelo: "ventaItem" },
  { clave: "insumoInventario", modelo: "insumoInventario" },
  { clave: "movimientoInventario", modelo: "movimientoInventario" },
  { clave: "empleado", modelo: "empleado" },
  { clave: "produccion", modelo: "produccion" },
  { clave: "asistencia", modelo: "asistencia" },
  // Orígenes del gasto espejo ANTES de compraGasto (por las FKs pagoNominaId/reciboServicioId/
  // mantenimientoId), y compraGasto ANTES de movimientoFondo (por la FK gastoId del débito).
  { clave: "pagoNomina", modelo: "pagoNomina" },
  { clave: "mantenimiento", modelo: "mantenimiento" },
  { clave: "reciboServicio", modelo: "reciboServicio" },
  { clave: "compraGasto", modelo: "compraGasto" },
  { clave: "movimientoFondo", modelo: "movimientoFondo" },
  { clave: "energiaGeneracion", modelo: "energiaGeneracion" },
  { clave: "medidorLectura", modelo: "medidorLectura" },
  // Sub-medición: el medidor cuelga del cliente (padre); la liquidación cuelga del medidor.
  { clave: "medidorCliente", modelo: "medidorCliente" },
  { clave: "liquidacionMedidor", modelo: "liquidacionMedidor" },
  { clave: "ajuste", modelo: "ajuste" },
];

export type ResultadoRestauracion =
  | { ok: true; totalFilas: number }
  | { ok: false; error: string };

/**
 * Restaura el respaldo: borra todos los datos actuales de esas tablas y carga los del
 * archivo. Si algo falla, la transacción se revierte y los datos actuales quedan intactos.
 */
export async function restaurarRespaldo(datos: unknown): Promise<ResultadoRestauracion> {
  if (typeof datos !== "object" || datos === null || Array.isArray(datos)) {
    return { ok: false, error: "El archivo no tiene el formato de un respaldo válido." };
  }
  const respaldo = datos as Record<string, unknown>;

  // Al menos una tabla conocida tiene que venir como arreglo; si no, no es un respaldo.
  const alguna = ORDEN_RESTAURACION.some((t) => Array.isArray(respaldo[t.clave]));
  if (!alguna) return { ok: false, error: "El archivo no parece un respaldo de Congela." };

  // Import diferido: así el módulo se puede probar (funciones puras) sin cargar la base.
  const { db } = await import("@/lib/db");

  try {
    let totalFilas = 0;
    await db.$transaction(
      async (tx) => {
        const cliente = tx as unknown as Record<string, { deleteMany: () => Promise<unknown>; createMany: (a: { data: Fila[] }) => Promise<unknown> }>;

        // Borrar en orden inverso (hijos antes que padres).
        for (const { modelo } of [...ORDEN_RESTAURACION].reverse()) {
          if (modelo === "ajuste") {
            // El respaldo NO trae los secretos (growattClave, anthropicApiKey) a propósito; si
            // los borráramos aquí quedarían perdidos tras restaurar (Growatt/OCR desconectados).
            // Se conservan; el resto de ajustes (nombre/NIT/precio kWh) sí se reemplaza.
            const ajusteDel = cliente[modelo] as unknown as { deleteMany: (a: { where: unknown }) => Promise<unknown> };
            await ajusteDel.deleteMany({ where: { clave: { notIn: CLAVES_SECRETAS } } });
          } else {
            await cliente[modelo].deleteMany();
          }
        }

        // Insertar en orden (padres antes que hijos), reviviendo las fechas.
        for (const { clave, modelo } of ORDEN_RESTAURACION) {
          const filas = respaldo[clave];
          if (!Array.isArray(filas) || filas.length === 0) continue;
          const data = filas.map((f) => revivirFechas(f as Fila));
          await cliente[modelo].createMany({ data });
          totalFilas += data.length;
        }

        // Reajustar las secuencias de autoincremento de Postgres. Se insertaron ids
        // EXPLÍCITOS, así que la secuencia quedó atrás y el PRÓXIMO insert (una venta nueva,
        // un abono) reusaría un id existente -> error de llave única. Se pone cada secuencia
        // en el máximo id actual. (Se omite "ajuste": su llave es `clave`, no un id serial.)
        const raw = tx as unknown as { $executeRawUnsafe: (q: string) => Promise<number> };
        for (const { modelo } of ORDEN_RESTAURACION) {
          if (modelo === "ajuste") continue;
          const tabla = modelo.charAt(0).toUpperCase() + modelo.slice(1); // delegado -> nombre de tabla
          await raw.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"${tabla}"', 'id'), COALESCE((SELECT MAX(id) FROM "${tabla}"), 1), (SELECT MAX(id) FROM "${tabla}") IS NOT NULL)`,
          );
        }
      },
      { timeout: 30000, maxWait: 10000 },
    );
    return { ok: true, totalFilas };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo restaurar el respaldo." };
  }
}
