// Clasifica un mantenimiento según su fecha programada respecto a hoy.
// Puro: sin dependencias de base de datos ni UI.

export type EstadoMantenimiento = "realizado" | "vencido" | "proximo" | "programado";

const DIA_MS = 24 * 60 * 60 * 1000;

export function estadoMantenimiento(
  m: { fechaProgramada: Date; fechaRealizada: Date | null },
  hoy: Date,
): EstadoMantenimiento {
  if (m.fechaRealizada) return "realizado";
  const diasFaltantes = Math.ceil((m.fechaProgramada.getTime() - hoy.getTime()) / DIA_MS);
  if (diasFaltantes < 0) return "vencido";
  if (diasFaltantes <= 7) return "proximo";
  return "programado";
}
