"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { revalidatePath } from "next/cache";

export async function guardarRegla(formData: FormData) {
  const reglaId = Number(formData.get("reglaId"));
  const tipo = String(formData.get("tipo")); // "fijo" | "porcentaje" | "resto"
  const activo = formData.get("activo") === "on";
  const prioridad = Number(formData.get("prioridad")) || 10;

  // "fijo": el usuario escribe pesos. "porcentaje": escribe un número (10 = 10%).
  const valorPesos = Number(formData.get("valorPesos")) || 0;
  const valorPorcentaje = Number(formData.get("valorPorcentaje")) || 0;

  await db.reglaReparto.update({
    where: { id: reglaId },
    data: {
      tipo,
      activo,
      prioridad,
      valorCents: tipo === "fijo" ? toCents(valorPesos) : null,
      valor: tipo === "porcentaje" ? valorPorcentaje / 100 : null,
    },
  });

  revalidatePath("/fondos");
}
