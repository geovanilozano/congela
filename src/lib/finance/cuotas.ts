// Clasifica una cuota del crédito según su fecha de vencimiento respecto a hoy.
// Puro: sin dependencias de base de datos ni UI.

export type EstadoCuota = "pagada" | "vencida" | "proxima" | "pendiente";

const DIA_MS = 24 * 60 * 60 * 1000;

export function estadoCuota(
  c: { fechaVencimiento: Date; estado: string },
  hoy: Date,
): EstadoCuota {
  if (c.estado === "pagada") return "pagada";
  const diasFaltantes = Math.ceil((c.fechaVencimiento.getTime() - hoy.getTime()) / DIA_MS);
  if (diasFaltantes < 0) return "vencida";
  if (diasFaltantes <= 7) return "proxima";
  return "pendiente";
}
