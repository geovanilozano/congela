// Motor de reparto de un ingreso entre fondos ("bolsillos"), según reglas ordenadas
// por prioridad. Puro: sin dependencias de base de datos ni UI.
//
// - "fijo": toma su monto (o lo que quede si no alcanza).
// - "porcentaje": toma un % del ingreso ORIGINAL.
// - "resto": recibe lo que sobra (la utilidad). Debe haber a lo sumo uno activo.

export type TipoRegla = "fijo" | "porcentaje" | "resto";

export interface ReglaFondo {
  fondo: string;
  tipo: TipoRegla;
  valorCents?: number; // para "fijo"
  valor?: number; // para "porcentaje" (0.1 = 10%)
  prioridad: number;
  activo: boolean;
}

export type Reparto = Record<string, number>;

/** Pasa los fondos (con su regla) al formato que espera el motor de reparto. Se usa tanto
 *  en el cierre real (caja/actions) como en el preview del cierre (caja/page), para que
 *  ambos calculen EXACTAMENTE lo mismo y no puedan divergir. */
export function mapearReglas(
  fondos: { nombre: string; regla: { tipo: string; valorCents: number | null; valor: number | null; prioridad: number; activo: boolean } | null }[],
): ReglaFondo[] {
  return fondos
    .filter((f) => f.regla)
    .map((f) => ({
      fondo: f.nombre,
      tipo: f.regla!.tipo as TipoRegla,
      valorCents: f.regla!.valorCents ?? undefined,
      valor: f.regla!.valor ?? undefined,
      prioridad: f.regla!.prioridad,
      activo: f.regla!.activo,
    }));
}

export interface ResultadoReparto {
  /** Cuánto le toca a cada fondo. */
  porFondo: Reparto;
  /**
   * Dinero que quedó sin dueño porque no hay ningún fondo "resto" activo.
   * Debe ser 0. Si no lo es, quien llama tiene que avisar: el dinero NO se descarta
   * en silencio (antes se perdía aquí).
   */
  sinAsignarCents: number;
}

export function repartirDetallado(ingresoCents: number, reglas: ReglaFondo[]): ResultadoReparto {
  const activas = reglas.filter((r) => r.activo).sort((a, b) => a.prioridad - b.prioridad);
  const porFondo: Reparto = {};
  let restante = ingresoCents;

  for (const r of activas) {
    if (r.tipo === "resto") continue;
    let monto = 0;
    if (r.tipo === "fijo") {
      monto = Math.min(r.valorCents ?? 0, restante);
    } else if (r.tipo === "porcentaje") {
      monto = Math.min(Math.round(ingresoCents * (r.valor ?? 0)), restante);
    }
    porFondo[r.fondo] = monto;
    restante -= monto;
  }

  const resto = activas.find((r) => r.tipo === "resto");
  if (resto) {
    porFondo[resto.fondo] = restante;
    return { porFondo, sinAsignarCents: 0 };
  }

  // Sin fondo "resto" activo: el sobrante se devuelve para que el cierre lo reclame.
  return { porFondo, sinAsignarCents: restante };
}

/** Igual que `repartirDetallado`, pero devuelve solo el reparto por fondo. */
export function repartir(ingresoCents: number, reglas: ReglaFondo[]): Reparto {
  return repartirDetallado(ingresoCents, reglas).porFondo;
}
