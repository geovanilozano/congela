"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { revalidatePath } from "next/cache";
import { exigirDueno } from "@/lib/auth/guard";
import { FONDO_INGRESO_ENERGIA } from "@/lib/seed";

export async function guardarRegla(formData: FormData) {
  await exigirDueno();
  const reglaId = Number(formData.get("reglaId"));
  const tipo = String(formData.get("tipo")); // "fijo" | "porcentaje" | "resto"
  // Un tipo inválido dejaría la regla sin efecto en el reparto y podría impedir cerrar la
  // caja (si el fondo era el "resto"). El motor solo entiende estos tres valores.
  if (!["fijo", "porcentaje", "resto"].includes(tipo)) return;
  if (!reglaId) return;

  // Los bolsillos automáticos (Crédito, Energía revendida) los maneja la app: no se editan a
  // mano ni por POST directo (se perderían o mezclarían con el reparto del cierre).
  const actual = await db.reglaReparto.findUnique({ where: { id: reglaId }, include: { fondo: true } });
  if (!actual) return;
  if (actual.fondo?.nombre === "Crédito" || actual.fondo?.nombre === FONDO_INGRESO_ENERGIA) return;

  const activo = formData.get("activo") === "on";
  const esEfectivo = formData.get("esEfectivo") === "on";
  const prioridad = Number(formData.get("prioridad")) || 10;

  // "fijo": el usuario escribe pesos. "porcentaje": escribe un número (10 = 10%).
  const valorPesos = Number(formData.get("valorPesos")) || 0;
  const valorPorcentaje = Number(formData.get("valorPorcentaje")) || 0;

  await db.$transaction([
    db.reglaReparto.update({
      where: { id: reglaId },
      data: {
        tipo,
        activo,
        prioridad,
        valorCents: tipo === "fijo" ? toCents(valorPesos) : null,
        valor: tipo === "porcentaje" ? valorPorcentaje / 100 : null,
      },
    }),
    // Si el bolsillo es efectivo (cuenta para el arqueo) se guarda en el mismo paso.
    db.fondo.update({ where: { id: actual.fondoId }, data: { esEfectivo } }),
  ]);

  revalidatePath("/fondos");
  // El preview del cierre en /caja depende de estas reglas: hay que refrescarlo también.
  revalidatePath("/caja");
}
