"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { generarAmortizacion } from "@/lib/finance/amortizacion";
import { revalidatePath } from "next/cache";

function sumarMeses(base: Date, meses: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + meses);
  return d;
}

export async function crearCredito(formData: FormData) {
  const entidad = String(formData.get("entidad") || "");
  const montoPesos = Number(formData.get("montoPesos")) || 0;
  const tasaMensualPct = Number(formData.get("tasaMensualPct")) || 0;
  const numCuotas = Number(formData.get("numCuotas")) || 1;
  const fechaInicio = formData.get("fechaInicio")
    ? new Date(String(formData.get("fechaInicio")))
    : new Date();

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

export async function registrarPago(formData: FormData) {
  const cuotaId = Number(formData.get("cuotaId"));
  const cuota = await db.cuotaAmortizacion.findUnique({ where: { id: cuotaId } });
  if (!cuota || cuota.estado === "pagada") return;

  await db.cuotaAmortizacion.update({
    where: { id: cuotaId },
    data: { estado: "pagada" },
  });

  await db.pagoCredito.create({
    data: {
      creditoId: cuota.creditoId,
      cuotaId: cuota.id,
      valorCents: cuota.cuotaCents,
    },
  });

  // ¿Quedó saldado el crédito? Si todas las cuotas están pagadas -> aplicar regla.
  const pendientes = await db.cuotaAmortizacion.count({
    where: { creditoId: cuota.creditoId, estado: { not: "pagada" } },
  });

  if (pendientes === 0) {
    await db.credito.update({
      where: { id: cuota.creditoId },
      data: { estado: "pagado" },
    });
    // Regla automática: el dinero de la cuota deja de apartarse -> pasa a Utilidad.
    const fondoCredito = await db.fondo.findUnique({
      where: { nombre: "Crédito" },
      include: { regla: true },
    });
    if (fondoCredito?.regla) {
      await db.reglaReparto.update({
        where: { id: fondoCredito.regla.id },
        data: { activo: false },
      });
    }
  }

  revalidatePath("/credito");
  revalidatePath("/fondos");
  revalidatePath("/");
}
