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

/**
 * Pone separador de miles a un valor en pesos (enteros). Para lo que escribe el usuario:
 * 1500000 -> "1.500.000". Ignora todo lo que no sea dígito; vacío se queda vacío.
 */
export const formatMiles = (valor: string | number): string => {
  const digitos = String(valor).replace(/\D/g, "");
  if (digitos === "") return "";
  return new Intl.NumberFormat("es-CO").format(Number(digitos));
};

/** Inversa de formatMiles: "1.500.000" -> 1500000. Sin dígitos -> 0. */
export const parseMiles = (texto: string): number => {
  const digitos = texto.replace(/\D/g, "");
  return digitos === "" ? 0 : Number(digitos);
};
