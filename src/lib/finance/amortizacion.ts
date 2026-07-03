// Cálculo de la tabla de amortización de un crédito (sistema de cuota fija / francés).
// Todo en centavos enteros. Puro: sin dependencias de base de datos ni UI.

export interface Cuota {
  numero: number;
  cuotaCents: number;
  interesCents: number;
  capitalCents: number;
  saldoCents: number;
}

export interface ParamsCredito {
  montoCents: number;
  tasaMensual: number; // ej. 0.02 = 2% mensual
  numCuotas: number;
}

export function generarAmortizacion({ montoCents, tasaMensual, numCuotas }: ParamsCredito): Cuota[] {
  const cuotas: Cuota[] = [];
  const i = tasaMensual;
  const cuotaCents =
    i === 0
      ? Math.round(montoCents / numCuotas)
      : Math.round((montoCents * i) / (1 - Math.pow(1 + i, -numCuotas)));

  let saldo = montoCents;
  for (let n = 1; n <= numCuotas; n++) {
    const interes = Math.round(saldo * i);
    let capital = cuotaCents - interes;
    if (n === numCuotas) capital = saldo; // la última cuota ajusta el redondeo
    saldo -= capital;
    cuotas.push({
      numero: n,
      cuotaCents: n === numCuotas ? capital + interes : cuotaCents,
      interesCents: interes,
      capitalCents: capital,
      saldoCents: saldo,
    });
  }
  return cuotas;
}

/** Total de intereses a pagar en toda la vida del crédito. */
export const totalIntereses = (tabla: Cuota[]): number =>
  tabla.reduce((a, c) => a + c.interesCents, 0);
