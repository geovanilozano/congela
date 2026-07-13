// Reparte un abono al crédito entre las cuotas pendientes, de la más vieja a la más
// nueva. Puro: sin dependencias de base de datos ni UI.

export interface CuotaAbono {
  id: number;
  cuotaCents: number;
  abonadoCents: number;
}

export interface ActualizacionCuota {
  id: number;
  abonadoCents: number; // nuevo total abonado
  pagada: boolean; // true si quedó cubierta por completo
}

export interface ResultadoAbono {
  actualizaciones: ActualizacionCuota[];
  sobranteCents: number; // dinero que sobró tras cubrir todas las cuotas
}

/**
 * Aplica `montoCents` a las cuotas (que deben venir ordenadas de la más vieja a la más
 * nueva). Llena cada cuota hasta su valor y pasa el resto a la siguiente. Solo devuelve
 * las cuotas que cambiaron.
 */
export function distribuirAbono(cuotas: CuotaAbono[], montoCents: number): ResultadoAbono {
  const actualizaciones: ActualizacionCuota[] = [];
  let restante = Math.max(0, Math.floor(montoCents));

  for (const c of cuotas) {
    if (restante <= 0) break;
    const falta = c.cuotaCents - c.abonadoCents;
    if (falta <= 0) continue; // ya estaba cubierta

    const aplica = Math.min(falta, restante);
    const nuevoAbonado = c.abonadoCents + aplica;
    restante -= aplica;
    actualizaciones.push({ id: c.id, abonadoCents: nuevoAbonado, pagada: nuevoAbonado >= c.cuotaCents });
  }

  return { actualizaciones, sobranteCents: restante };
}
