"use server";

import { db } from "@/lib/db";
import { repartirDetallado, mapearReglas } from "@/lib/finance/fondos";
import { exigirRol } from "@/lib/auth/guard";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Cierra la caja del día: suma las ventas pendientes y reparte el total en los fondos.
 *
 * Va todo dentro de una transacción: o se guarda el cierre COMPLETO (ventas marcadas
 * + movimientos de cada fondo), o no se guarda nada. Antes eran tres escrituras
 * sueltas: si fallaba a mitad, las ventas quedaban cerradas pero el dinero nunca
 * entraba a los fondos.
 */
export async function cerrarCaja() {
  await exigirRol("dueno", "cajero");
  const resultado = await db.$transaction(async (tx) => {
    const ventas = await tx.venta.findMany({ where: { cierreId: null } });
    if (ventas.length === 0) return { estado: "sinVentas" as const };

    const totalCents = ventas.reduce((a, v) => a + v.totalCents, 0);

    const fondos = await tx.fondo.findMany({ include: { regla: true } });
    const reglas = mapearReglas(fondos);

    // El fondo "Crédito" solo debe COMPLETAR la próxima cuota, no volver a apartarla entera
    // en cada cierre. Se limita su aporte a lo que le falta para llegar a la cuota (se le
    // descuenta lo que ya tiene apartado). Así, una vez reunida la cuota deja de apartar y
    // ese dinero pasa a la Utilidad; al pagar la cuota el fondo se vacía (ver registrarPago)
    // y vuelve a apartar para la siguiente. Funciona con cierres diarios, semanales o mensuales.
    const fondoCredito = fondos.find((f) => f.nombre === "Crédito");
    if (fondoCredito?.regla?.activo && fondoCredito.regla.tipo === "fijo") {
      const saldo =
        (await tx.movimientoFondo.aggregate({ where: { fondoId: fondoCredito.id }, _sum: { montoCents: true } }))._sum.montoCents ?? 0;
      const objetivo = fondoCredito.regla.valorCents ?? 0;
      const regla = reglas.find((r) => r.fondo === "Crédito");
      if (regla) regla.valorCents = Math.max(0, objetivo - saldo);
    }

    const { porFondo, sinAsignarCents } = repartirDetallado(totalCents, reglas);

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

/**
 * Anula el ÚLTIMO cierre de caja: revierte todo lo que hizo.
 * Las ventas de ese cierre vuelven a quedar pendientes y se borran los movimientos que
 * repartieron el dinero en los fondos (así los saldos vuelven a como estaban). Sirve
 * cuando se cerró por error o con una venta equivocada. Solo el último, para no enredar
 * cierres anteriores.
 */
export async function anularUltimoCierre() {
  await exigirRol("dueno", "cajero");

  await db.$transaction(async (tx) => {
    const ultimo = await tx.cierreCaja.findFirst({ orderBy: { id: "desc" } });
    if (!ultimo) return;

    // Las ventas vuelven a estar pendientes de cierre.
    await tx.venta.updateMany({ where: { cierreId: ultimo.id }, data: { cierreId: null } });
    // Se borran los movimientos que repartieron ese dinero (revierte los saldos de fondos).
    await tx.movimientoFondo.deleteMany({ where: { cierreId: ultimo.id } });
    // Y se borra el cierre en sí.
    await tx.cierreCaja.delete({ where: { id: ultimo.id } });
  });

  revalidatePath("/caja");
  revalidatePath("/fondos");
  revalidatePath("/");
}
