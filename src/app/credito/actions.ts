"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { generarAmortizacion } from "@/lib/finance/amortizacion";
import { distribuirAbono } from "@/lib/finance/abonos";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fechaLocalODefecto } from "@/lib/fechas";

function sumarMeses(base: Date, meses: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + meses);
  return d;
}

export async function crearCredito(formData: FormData) {
  const entidad = String(formData.get("entidad") || "");
  const montoPesos = Number(formData.get("montoPesos")) || 0;
  const tasaMensualPct = Number(formData.get("tasaMensualPct")) || 0;
  // Al menos 1 cuota entera: un número negativo o con decimales generaría una tabla vacía
  // o cuotas infinitas (el input tiene min="1", pero un POST directo podría saltárselo).
  const numCuotas = Math.max(1, Math.floor(Number(formData.get("numCuotas")) || 1));
  const fechaInicio = fechaLocalODefecto(formData.get("fechaInicio"));

  // Sin monto no hay crédito que amortizar: se avisa en vez de salir en silencio.
  if (montoPesos <= 0) redirect("/credito?error=monto");

  const montoCents = toCents(montoPesos);
  const tasaMensual = tasaMensualPct / 100;
  const tabla = generarAmortizacion({ montoCents, tasaMensual, numCuotas });

  await db.credito.create({
    data: {
      entidad,
      montoCents,
      tasaMensual,
      numCuotas,
      fechaInicio,
      cuotas: {
        create: tabla.map((c) => ({
          numero: c.numero,
          fechaVencimiento: sumarMeses(fechaInicio, c.numero),
          cuotaCents: c.cuotaCents,
          capitalCents: c.capitalCents,
          interesCents: c.interesCents,
          saldoCents: c.saldoCents,
        })),
      },
    },
  });

  // El fondo "Crédito" aparta automáticamente el valor de la cuota en cada cierre.
  const fondoCredito = await db.fondo.findUnique({
    where: { nombre: "Crédito" },
    include: { regla: true },
  });
  if (fondoCredito?.regla) {
    await db.reglaReparto.update({
      where: { id: fondoCredito.regla.id },
      data: { tipo: "fijo", valorCents: tabla[0]?.cuotaCents ?? 0, activo: true },
    });
  }

  revalidatePath("/credito");
  revalidatePath("/fondos");
}

/**
 * Registra un abono al crédito. El monto puede ser una cuota completa, menos (abono
 * parcial) o más (adelanta varias cuotas). Se reparte de la cuota más vieja a la más
 * nueva. Si con el abono quedan todas las cuotas pagadas, el crédito se marca PAGADO y
 * el fondo "Crédito" se desactiva (esa plata pasa a utilidad).
 */
export async function registrarPago(formData: FormData) {
  const creditoId = Number(formData.get("creditoId"));
  const montoCents = toCents(Number(formData.get("montoPesos")) || 0);
  if (!creditoId || montoCents <= 0) redirect(`/credito?error=abono`);

  // Cuotas aún no pagadas, de la más vieja a la más nueva.
  const pendientes = await db.cuotaAmortizacion.findMany({
    where: { creditoId, estado: { not: "pagada" } },
    orderBy: { numero: "asc" },
    select: { id: true, cuotaCents: true, abonadoCents: true },
  });

  const { actualizaciones } = distribuirAbono(pendientes, montoCents);
  if (actualizaciones.length === 0) redirect(`/credito?error=abono`);

  const aplicadoCents = actualizaciones.reduce(
    (a, u) => a + (u.abonadoCents - (pendientes.find((c) => c.id === u.id)?.abonadoCents ?? 0)),
    0,
  );

  await db.$transaction(async (tx) => {
    for (const u of actualizaciones) {
      await tx.cuotaAmortizacion.update({
        where: { id: u.id },
        data: { abonadoCents: u.abonadoCents, estado: u.pagada ? "pagada" : "parcial" },
      });
    }
    // Un solo registro de pago por el monto realmente aplicado (sin el sobrante).
    await tx.pagoCredito.create({ data: { creditoId, valorCents: aplicadoCents } });

    // ¿Quedó saldado el crédito?
    const faltan = await tx.cuotaAmortizacion.count({ where: { creditoId, estado: { not: "pagada" } } });
    if (faltan === 0) {
      await tx.credito.update({ where: { id: creditoId }, data: { estado: "pagado" } });
      // El dinero de la cuota deja de apartarse -> pasa a utilidad.
      const fondoCredito = await tx.fondo.findUnique({ where: { nombre: "Crédito" }, include: { regla: true } });
      if (fondoCredito?.regla) {
        await tx.reglaReparto.update({ where: { id: fondoCredito.regla.id }, data: { activo: false } });
      }
    }
  });

  revalidatePath("/credito");
  revalidatePath("/fondos");
  revalidatePath("/");
}
