"use server";

import { db } from "@/lib/db";
import { repartir, ReglaFondo } from "@/lib/finance/fondos";
import { revalidatePath } from "next/cache";

/** Lee las reglas activas de los fondos en el formato que espera el motor de reparto. */
async function reglasActivas(): Promise<{ nombre: string; regla: ReglaFondo }[]> {
  const fondos = await db.fondo.findMany({ include: { regla: true } });
  return fondos
    .filter((f) => f.regla)
    .map((f) => ({
      nombre: f.nombre,
      regla: {
        fondo: f.nombre,
        tipo: f.regla!.tipo as ReglaFondo["tipo"],
        valorCents: f.regla!.valorCents ?? undefined,
        valor: f.regla!.valor ?? undefined,
        prioridad: f.regla!.prioridad,
        activo: f.regla!.activo,
      },
    }));
}

export async function cerrarCaja() {
  const ventas = await db.venta.findMany({ where: { cierreId: null } });
  if (ventas.length === 0) return;

  const totalCents = ventas.reduce((a, v) => a + v.totalCents, 0);
  const reglas = await reglasActivas();
  const reparto = repartir(totalCents, reglas.map((r) => r.regla));

  const cierre = await db.cierreCaja.create({ data: { totalCents } });

  // Enlazar las ventas a este cierre.
  await db.venta.updateMany({
    where: { id: { in: ventas.map((v) => v.id) } },
    data: { cierreId: cierre.id },
  });

  // Crear un movimiento por cada fondo según el reparto.
  const fondos = await db.fondo.findMany();
  for (const f of fondos) {
    const monto = reparto[f.nombre] ?? 0;
    if (monto === 0) continue;
    await db.movimientoFondo.create({
      data: {
        fondoId: f.id,
        montoCents: monto,
        concepto: `Cierre de caja #${cierre.id}`,
        cierreId: cierre.id,
      },
    });
  }

  revalidatePath("/caja");
  revalidatePath("/fondos");
  revalidatePath("/");
}
