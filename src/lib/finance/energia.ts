// Balance energético: relación entre lo que generan los paneles y lo que consume
// la empresa. Modelo simple sin batería (la solar cubre el consumo del momento;
// lo que falta se compra a la red; lo que sobra es excedente).
// Puro: sin dependencias de base de datos ni UI.

export interface ParamsBalance {
  generacionKwh: number;
  consumoKwh: number;
  precioKwhCents: number; // precio de compra a la red, en centavos por kWh
}

export interface Balance {
  solarUsadaKwh: number; // energía solar aprovechada
  redKwh: number; // energía comprada a la red
  excedenteKwh: number; // energía solar de sobra
  ahorroCents: number; // dinero ahorrado por usar solar
  costoRedCents: number; // dinero que toca pagar a la red
  porcentajeSolar: number; // % del consumo cubierto por los paneles (0-100)
}

export function balanceEnergia({ generacionKwh, consumoKwh, precioKwhCents }: ParamsBalance): Balance {
  const solarUsadaKwh = Math.min(generacionKwh, consumoKwh);
  const redKwh = Math.max(0, consumoKwh - generacionKwh);
  const excedenteKwh = Math.max(0, generacionKwh - consumoKwh);
  const porcentajeSolar = consumoKwh > 0 ? Math.round((solarUsadaKwh / consumoKwh) * 100) : 0;

  return {
    solarUsadaKwh,
    redKwh,
    excedenteKwh,
    ahorroCents: Math.round(solarUsadaKwh * precioKwhCents),
    costoRedCents: Math.round(redKwh * precioKwhCents),
    porcentajeSolar,
  };
}
