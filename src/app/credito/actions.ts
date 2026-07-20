"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { generarAmortizacion } from "@/lib/finance/amortizacion";
import { distribuirAbono } from "@/lib/finance/abonos";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fechaLocalODefecto } from "@/lib/fechas";
import { exigirDueno } from "@/lib/auth/guard";
import { Prisma } from "@/generated/prisma/client";

// Suma meses SIN el desbordamiento clásico de JS: un crédito que arranca el 31-ene no
// debe correr su cuota 1 a marzo (JS convertiría "31-feb" en 3-mar). Si el día original
// no existe en el mes destino, se ancla al último día de ese mes.
function sumarMeses(base: Date, meses: number): Date {
  const dia = base.getDate();
  const d = new Date(base);
  d.setDate(1);
  d.setMonth(d.getMonth() + meses);
  const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, ultimoDia));
  return d;
}

// El fondo "Crédito" debe apartar en cada cierre la suma de la PRÓXIMA cuota pendiente
// de CADA crédito activo. Recalcularlo (en vez de pisar el valor con la cuota de un solo
// crédito) mantiene correcta la reserva cuando hay varios créditos a la vez, y desactiva
// el fondo únicamente cuando ya no queda ningún crédito por pagar.
async function recalcularFondoCredito(tx: Prisma.TransactionClient) {
  const fondoCredito = await tx.fondo.findUnique({ where: { nombre: "Crédito" }, include: { regla: true } });
  if (!fondoCredito?.regla) return;

  const activos = await tx.credito.findMany({ where: { estado: { not: "pagado" } }, select: { id: true } });
  let reservaCents = 0;
  for (const c of activos) {
    const prox = await tx.cuotaAmortizacion.findFirst({
      where: { creditoId: c.id, estado: { not: "pagada" } },
      orderBy: { numero: "asc" },
      select: { cuotaCents: true },
    });
    reservaCents += prox?.cuotaCents ?? 0;
  }

  await tx.reglaReparto.update({
    where: { id: fondoCredito.regla.id },
    data: reservaCents > 0
      ? { tipo: "fijo", valorCents: reservaCents, activo: true }
      : { activo: false },
  });
}

export async function crearCredito(formData: FormData) {
  await exigirDueno();
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

  // Crear el crédito y ajustar el fondo van juntos: si algo falla, no queremos un crédito
  // creado con el fondo sin actualizar (ni viceversa).
  await db.$transaction(async (tx) => {
    await tx.credito.create({
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

    // El fondo "Crédito" aparta automáticamente en cada cierre la suma de las próximas
    // cuotas de TODOS los créditos activos (incluido el que se acaba de crear).
    await recalcularFondoCredito(tx);
  });

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
  await exigirDueno();
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
    }
    // Reajustar la reserva del fondo a las próximas cuotas de los créditos que sigan
    // activos: baja al pagar una cuota y se desactiva solo cuando ya no queda ninguno.
    await recalcularFondoCredito(tx);
  });

  revalidatePath("/credito");
  revalidatePath("/fondos");
  revalidatePath("/");
}
