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

export function repartir(ingresoCents: number, reglas: ReglaFondo[]): Reparto {
  const activas = reglas.filter((r) => r.activo).sort((a, b) => a.prioridad - b.prioridad);
  const reparto: Reparto = {};
  let restante = ingresoCents;

  for (const r of activas) {
    if (r.tipo === "resto") continue;
    let monto = 0;
    if (r.tipo === "fijo") {
      monto = Math.min(r.valorCents ?? 0, restante);
    } else if (r.tipo === "porcentaje") {
      monto = Math.min(Math.round(ingresoCents * (r.valor ?? 0)), restante);
    }
    reparto[r.fondo] = monto;
    restante -= monto;
  }

  const resto = activas.find((r) => r.tipo === "resto");
  if (resto) reparto[resto.fondo] = restante;
  return reparto;
}
