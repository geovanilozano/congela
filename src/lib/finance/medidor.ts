// Liquidación de un medidor de cliente (sub-medición): calcula cuánto cobrarle según su
// consumo y los parámetros del extracto de energía, tal como cobra el operador de red (ESSA).
//
//   energía   = consumo(kWh) × tarifa CU ($/kWh)
//   subsidio  = % del extracto × (min(consumo, subsistencia) × CU)   ← solo el tramo de subsistencia
//   alumbrado = % (≈6% en Barrancabermeja) × energía
//   aseo      = % × aseo total del extracto (cargo fijo, opcional)
//   total     = energía − subsidio + alumbrado + aseo
//
// Puro: sin dependencias de base de datos ni UI. Todo el dinero en CENTAVOS.
// La tarifa CU se guarda en centavos de peso por kWh (ej. 824,03 $/kWh -> 82403).

export interface EntradaLiquidacion {
  lecturaAnterior: number; // kWh
  lecturaActual: number; // kWh
  factor: number; // factor de multiplicación del medidor (normalmente 1)
  tarifaCuCents: number; // centavos de peso por kWh
  subsidioPct: number; // % del extracto (ej. 47, 50)
  subsistenciaKwh: number; // tope de kWh subsidiados
  consumoTotalKwh: number; // consumo TOTAL del recibo (0 = este medidor es el único)
  alumbradoTotalCents: number; // valor total del alumbrado del extracto
  alumbradoPct: number; // % del alumbrado total que paga el cliente
  aseoTotalCents: number; // cargo fijo de aseo del extracto
  aseoPct: number; // % de aseo que paga el cliente
}

export interface ResultadoLiquidacion {
  consumoKwh: number;
  energiaCents: number;
  kwhSubsidiado: number; // cuántos kWh alcanzaron subsidio (tope = subsistencia)
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

export function liquidarMedidor(e: EntradaLiquidacion): ResultadoLiquidacion {
  // Consumo = (lectura actual − anterior) × factor. Nunca negativo (lectura mal digitada).
  const consumoKwh = Math.max(0, Math.round((e.lecturaActual - e.lecturaAnterior) * (e.factor || 1)));
  const tarifa = Math.max(0, e.tarifaCuCents);
  const energiaCents = consumoKwh * tarifa;

  // Subsidio. El tope de subsistencia (y por tanto el subsidio) es del RECIBO COMPLETO,
  // no de cada medidor. Si varios medidores comparten el recibo (consumoTotalKwh > 0), se
  // calcula el subsidio del recibo entero y se reparte proporcional a lo que consumió este
  // medidor. Si es el único (0), el total del recibo es su propio consumo.
  const totalReciboKwh = e.consumoTotalKwh > 0 ? e.consumoTotalKwh : consumoKwh;
  const kwhSubsidiadoRecibo = Math.min(totalReciboKwh, Math.max(0, e.subsistenciaKwh));
  const subsidioReciboCents = Math.round(kwhSubsidiadoRecibo * tarifa * (pctValido(e.subsidioPct) / 100));
  const proporcion = totalReciboKwh > 0 ? Math.min(1, consumoKwh / totalReciboKwh) : 0;
  const subsidioCents = Math.round(subsidioReciboCents * proporcion);
  // La parte de kWh subsidiados que le corresponde a ESTE medidor (para mostrarla).
  const kwhSubsidiado = Math.round(kwhSubsidiadoRecibo * proporcion);

  // Alumbrado público: un % del valor TOTAL del alumbrado del extracto (así se reparte
  // entre los medidores del recibo, igual que el aseo).
  const alumbradoClienteCents = Math.round(Math.max(0, e.alumbradoTotalCents) * (pctValido(e.alumbradoPct) / 100));

  // Aseo: un % de un cargo fijo del extracto (opcional).
  const aseoClienteCents = Math.round(Math.max(0, e.aseoTotalCents) * (pctValido(e.aseoPct) / 100));

  // El total no baja de 0 (un subsidio mayor que el consumo no genera un cobro negativo).
  const totalCents = Math.max(0, energiaCents - subsidioCents + alumbradoClienteCents + aseoClienteCents);

  return { consumoKwh, energiaCents, kwhSubsidiado, subsidioCents, alumbradoClienteCents, aseoClienteCents, totalCents };
}
