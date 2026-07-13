"use server";

import { db } from "@/lib/db";
import { repartirDetallado, ReglaFondo } from "@/lib/finance/fondos";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** Pasa las reglas de los fondos al formato que espera el motor de reparto. */
function aReglas(
  fondos: { nombre: string; regla: { tipo: string; valorCents: number | null; valor: number | null; prioridad: number; activo: boolean } | null }[],
): ReglaFondo[] {
  return fondos
    .filter((f) => f.regla)
    .map((f) => ({
      fondo: f.nombre,
      tipo: f.regla!.tipo as ReglaFondo["tipo"],
      valorCents: f.regla!.valorCents ?? undefined,
      valor: f.regla!.valor ?? undefined,
      prioridad: f.regla!.prioridad,
      activo: f.regla!.activo,
    }));
}

/**
 * Cierra la caja del día: suma las ventas pendientes y reparte el total en los fondos.
 *
 * Va todo dentro de una transacción: o se guarda el cierre COMPLETO (ventas marcadas
 * + movimientos de cada fondo), o no se guarda nada. Antes eran tres escrituras
 * sueltas: si fallaba a mitad, las ventas quedaban cerradas pero el dinero nunca
 * entraba a los fondos.
 */
export async function cerrarCaja() {
  const resultado = await db.$transaction(async (tx) => {
    const ventas = await tx.venta.findMany({ where: { cierreId: null } });
    if (ventas.length === 0) return { estado: "sinVentas" as const };

    const totalCents = ventas.reduce((a, v) => a + v.totalCents, 0);

    const fondos = await tx.fondo.findMany({ include: { regla: true } });
    const { porFondo, sinAsignarCents } = repartirDetallado(totalCents, aReglas(fondos));

    // Si no hay ningún fondo "resto" (Utilidad) activo, parte del dinero se quedaría
    // sin dueño. Antes desaparecía en silencio; ahora no se cierra la caja.
    if (sinAsignarCents > 0) return { estado: "sinResto" as const };

    const cierre = await tx.cierreCaja.create({ data: { totalCents } });

    await tx.venta.updateMany({
      where: { id: { in: ventas.map((v) => v.id) } },
      data: { cierreId: cierre.id },
    });

    for (const f of fondos) {
      const monto = porFondo[f.nombre] ?? 0;
      if (monto === 0) continue;
      await tx.movimientoFondo.create({
        data: {
          fondoId: f.id,
          montoCents: monto,
          concepto: `Cierre de caja #${cierre.id}`,
          cierreId: cierre.id,
        },
      });
    }

    return { estado: "ok" as const };
  });

  // El redirect va fuera de la transacción (por dentro la abortaría).
  if (resultado.estado === "sinResto") redirect("/caja?error=sinResto");

  revalidatePath("/caja");
  revalidatePath("/fondos");
  revalidatePath("/");
}
