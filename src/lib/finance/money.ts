// Manejo de dinero en centavos (enteros) para evitar errores de redondeo.

/** Convierte un valor en pesos a centavos enteros. Ej: 1234.56 -> 123456 */
export const toCents = (pesos: number): number => Math.round(pesos * 100);

/** Convierte centavos enteros a pesos. Ej: 123456 -> 1234.56 */
export const fromCents = (cents: number): number => cents / 100;

/** Redondea un número a 2 decimales de forma segura. */
export const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Formatea centavos como moneda para mostrar (es-CO por defecto). */
export const formatMoney = (cents: number, currency = "COP", locale = "es-CO"): string =>
  new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(
    fromCents(cents),
  );
