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
  alumbradoPct: number; // % de la energía (ej. 6)
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

  // El subsidio solo cubre el consumo hasta el tope de subsistencia (así lo aplica ESSA):
  // por eso a consumos altos no se subsidia todo.
  const kwhSubsidiado = Math.min(consumoKwh, Math.max(0, e.subsistenciaKwh));
  const subsidioCents = Math.round(kwhSubsidiado * tarifa * (pctValido(e.subsidioPct) / 100));

  // Alumbrado público: un % del valor de la energía.
  const alumbradoClienteCents = Math.round(energiaCents * (pctValido(e.alumbradoPct) / 100));

  // Aseo: un % de un cargo fijo del extracto (opcional).
  const aseoClienteCents = Math.round(Math.max(0, e.aseoTotalCents) * (pctValido(e.aseoPct) / 100));

  // El total no baja de 0 (un subsidio mayor que el consumo no genera un cobro negativo).
  const totalCents = Math.max(0, energiaCents - subsidioCents + alumbradoClienteCents + aseoClienteCents);

  return { consumoKwh, energiaCents, kwhSubsidiado, subsidioCents, alumbradoClienteCents, aseoClienteCents, totalCents };
}
