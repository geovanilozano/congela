// A qué bolsillo (fondo) debita cada gasto según su categoría.
//
// Regla: el gasto sale del bolsillo con el MISMO nombre de la categoría si ese fondo existe;
// si no, del bolsillo general "Operación". No se puede capitalizar la categoría a ciegas: van
// en minúscula sin tilde ("nomina", "servicios") y los fondos con mayúscula y tilde ("Nómina",
// "Servicios"), así que se usa un mapa explícito.
import type { Prisma } from "@/generated/prisma/client";

const MAPA_CATEGORIA_FONDO: Record<string, string> = {
  arriendo: "Arriendo",
  nomina: "Nómina",
  servicios: "Servicios",
  mantenimiento: "Mantenimiento",
  bolsas: "Bolsas",
  transporte: "Transporte",
  reparaciones: "Reparaciones",
  impuestos: "Impuestos",
  // "otro" y cualquier categoría desconocida caen en "Operación" (fallback).
};

// Bolsillos que la app maneja sola: NUNCA se debitan por un gasto (su saldo tiene otro
// significado — reserva de cuota / ingreso de energía).
const FONDOS_AUTOMATICOS = new Set(["Crédito", "Energía revendida"]);

/** Nombre del bolsillo que le corresponde a una categoría de gasto (puro, sin BD). */
export function nombreFondoDeCategoria(categoria: string): string {
  const nombre = MAPA_CATEGORIA_FONDO[categoria] ?? "Operación";
  // Guarda: si por lo que fuera cayera en un bolsillo automático, se manda a "Operación".
  return FONDOS_AUTOMATICOS.has(nombre) ? "Operación" : nombre;
}

/**
 * Devuelve el id del bolsillo a debitar por un gasto de esta categoría: el homónimo si existe,
 * si no el "Operación". null si ni siquiera existe "Operación" (en ese caso no se debita, para
 * no romper el registro del gasto). Se llama dentro de la transacción del gasto.
 */
export async function fondoDestinoDeGasto(tx: Prisma.TransactionClient, categoria: string): Promise<number | null> {
  const nombre = nombreFondoDeCategoria(categoria);
  const fondo = await tx.fondo.findUnique({ where: { nombre }, select: { id: true } });
  if (fondo) return fondo.id;
  if (nombre === "Operación") return null;
  const operacion = await tx.fondo.findUnique({ where: { nombre: "Operación" }, select: { id: true } });
  return operacion?.id ?? null;
}

/**
 * Registra el DÉBITO de un gasto: un movimiento NEGATIVO en el bolsillo que le corresponde,
 * atado al gasto (gastoId) para poder revertirlo. Se permite que el bolsillo quede en negativo
 * (eso justamente evidencia que se gastó más de lo apartado). Si no hay bolsillo destino, no
 * se debita (no se rompe el registro del gasto). Se llama dentro de la transacción del gasto.
 */
export async function debitarGasto(
  tx: Prisma.TransactionClient,
  gastoId: number,
  categoria: string,
  valorCents: number,
): Promise<void> {
  if (valorCents <= 0) return;
  const fondoId = await fondoDestinoDeGasto(tx, categoria);
  if (fondoId === null) return;
  await tx.movimientoFondo.create({
    data: { fondoId, montoCents: -valorCents, concepto: `Gasto #${gastoId} (${categoria})`, gastoId },
  });
}
