// Indicadores financieros para toma de decisiones. Todo en centavos enteros.
// Puro: sin dependencias de base de datos ni UI.

/**
 * Costo de producir una bolsa = gastos totales / bolsas producidas.
 * Devuelve `null` (indefinido) si no hubo producción: sin bolsas producidas el costo
 * unitario no existe, y devolver 0 haría creer que el negocio es 100% rentable.
 */
export function costoPorBolsa(gastosCents: number, bolsas: number): number | null {
  if (bolsas <= 0) return null;
  return Math.round(gastosCents / bolsas);
}

/** Ganancia por bolsa = precio de venta − costo. `null` si el costo es indefinido. */
export function margenPorBolsa(precioVentaCents: number, costoBolsaCents: number | null): number | null {
  if (costoBolsaCents === null) return null;
  return precioVentaCents - costoBolsaCents;
}

/**
 * Bolsas que hay que vender para cubrir los gastos.
 * null si el margen es indefinido (sin producción) o si se pierde dinero por bolsa.
 */
export function puntoEquilibrio(gastosCents: number, margenBolsaCents: number | null): number | null {
  if (margenBolsaCents === null || margenBolsaCents <= 0) return null;
  return Math.ceil(gastosCents / margenBolsaCents);
}

export interface Recuperacion {
  porcentaje: number; // 0-100
  faltanteCents: number;
  recuperado: boolean;
}

export interface MesResumen {
  mes: string; // "AAAA-MM"
  ingresosCents: number;
  gastosCents: number;
  utilidadCents: number;
}

/** Clave de mes en HORA LOCAL: "AAAA-MM". (No usar UTC: correría las fechas de borde.) */
function claveMes(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Agrupa ventas y gastos por mes y calcula la utilidad de cada uno. Sirve para ver la
 * tendencia del negocio ("¿voy mejor que el mes pasado?"), no solo el total acumulado.
 * Devuelve los meses en orden ascendente.
 */
export function resumenPorMes(
  ventas: { fecha: Date; totalCents: number }[],
  gastos: { fecha: Date; valorCents: number }[],
): MesResumen[] {
  const porMes = new Map<string, { ingresosCents: number; gastosCents: number }>();
  const bucket = (mes: string) => {
    let b = porMes.get(mes);
    if (!b) porMes.set(mes, (b = { ingresosCents: 0, gastosCents: 0 }));
    return b;
  };

  for (const v of ventas) bucket(claveMes(v.fecha)).ingresosCents += v.totalCents;
  for (const g of gastos) bucket(claveMes(g.fecha)).gastosCents += g.valorCents;

  return [...porMes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, b]) => ({
      mes,
      ingresosCents: b.ingresosCents,
      gastosCents: b.gastosCents,
      utilidadCents: b.ingresosCents - b.gastosCents,
    }));
}

/** Cuánto de la inversión se ha recuperado con la utilidad acumulada. */
export function recuperacionInversion(invertidoCents: number, utilidadCents: number): Recuperacion {
  if (invertidoCents <= 0) {
    return { porcentaje: 0, faltanteCents: 0, recuperado: true };
  }
  const recuperado = utilidadCents >= invertidoCents;
  const porcentaje = Math.min(100, Math.round((utilidadCents / invertidoCents) * 100));
  const faltanteCents = Math.max(0, invertidoCents - utilidadCents);
  return { porcentaje, faltanteCents, recuperado };
}
