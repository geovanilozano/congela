// Liquidación de un medidor de cliente (sub-medición): calcula cuánto cobrarle según su
// consumo y la tarifa del extracto, igual que una factura de energía.
//
//   energía  = consumo(kWh) × tarifa CU ($/kWh)
//   total    = energía − subsidio + alumbrado×% + aseo×%
//
// Puro: sin dependencias de base de datos ni UI. Todo el dinero en CENTAVOS.
// La tarifa CU se guarda en centavos de peso por kWh (ej. 824,03 $/kWh -> 82403).

export interface EntradaLiquidacion {
  lecturaAnterior: number; // kWh
  lecturaActual: number; // kWh
  factor: number; // factor de multiplicación del medidor (normalmente 1)
  tarifaCuCents: number; // centavos de peso por kWh
  subsidioCents: number; // descuento del extracto (monto)
  alumbradoTotalCents: number;
  alumbradoPct: number; // % que paga el cliente (0-100)
  aseoTotalCents: number;
  aseoPct: number; // % que paga el cliente (0-100)
}

export interface ResultadoLiquidacion {
  consumoKwh: number;
  energiaCents: number;
  subsidioCents: number;
  alumbradoClienteCents: number;
  aseoClienteCents: number;
  totalCents: number;
}

/** Acota un porcentaje al rango 0-100 (y descarta NaN). */
function pctValido(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.min(100, Math.max(0, p));
}

/** Parte de un total según un porcentaje, redondeada a centavos. */
function parte(totalCents: number, porcentaje: number): number {
  return Math.round(Math.max(0, totalCents) * (pctValido(porcentaje) / 100));
}

export function liquidarMedidor(e: EntradaLiquidacion): ResultadoLiquidacion {
  // Consumo = (lectura actual − anterior) × factor. Nunca negativo (lectura mal digitada).
  const consumoKwh = Math.max(0, Math.round((e.lecturaActual - e.lecturaAnterior) * (e.factor || 1)));
  const energiaCents = consumoKwh * Math.max(0, e.tarifaCuCents);
  const subsidioCents = Math.max(0, e.subsidioCents);
  const alumbradoClienteCents = parte(e.alumbradoTotalCents, e.alumbradoPct);
  const aseoClienteCents = parte(e.aseoTotalCents, e.aseoPct);
  // El total no baja de 0 (un subsidio mayor que el consumo no genera un cobro negativo).
  const totalCents = Math.max(0, energiaCents - subsidioCents + alumbradoClienteCents + aseoClienteCents);

  return { consumoKwh, energiaCents, subsidioCents, alumbradoClienteCents, aseoClienteCents, totalCents };
}
