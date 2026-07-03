// Indicadores financieros para toma de decisiones. Todo en centavos enteros.
// Puro: sin dependencias de base de datos ni UI.

/** Costo de producir una bolsa = gastos totales / bolsas producidas. */
export function costoPorBolsa(gastosCents: number, bolsas: number): number {
  if (bolsas <= 0) return 0;
  return Math.round(gastosCents / bolsas);
}

/** Ganancia por bolsa = precio de venta − costo de producción. */
export function margenPorBolsa(precioVentaCents: number, costoBolsaCents: number): number {
  return precioVentaCents - costoBolsaCents;
}

/** Bolsas que hay que vender para cubrir los gastos. null si se pierde por bolsa. */
export function puntoEquilibrio(gastosCents: number, margenBolsaCents: number): number | null {
  if (margenBolsaCents <= 0) return null;
  return Math.ceil(gastosCents / margenBolsaCents);
}

export interface Recuperacion {
  porcentaje: number; // 0-100
  faltanteCents: number;
  recuperado: boolean;
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
