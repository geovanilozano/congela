"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { guardarFoto } from "@/lib/upload";
import { revalidatePath } from "next/cache";
import { fechaLocal } from "@/lib/fechas";
import { exigirDueno } from "@/lib/auth/guard";

// Devuelve el número, o null si el campo viene vacío o no es un número válido (evita
// meter NaN en una columna Float, que Prisma rechaza con un error 500).
function numeroOpcional(v: FormDataEntryValue | null): number | null {
  if (v === null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export async function registrarRecibo(formData: FormData) {
  await exigirDueno();
  const tipo = String(formData.get("tipo") || "energia");
  const valorPesos = Number(formData.get("valorPesos")) || 0;
  const consumo = numeroOpcional(formData.get("consumo"));
  const periodoInicio = fechaLocal(String(formData.get("periodoInicio") ?? ""));
  const periodoFin = fechaLocal(String(formData.get("periodoFin") ?? ""));
  const valorCents = toCents(valorPesos);

  const fotoUrl = await guardarFoto(formData.get("foto"));

  // El recibo de servicios (energía, agua, gas…) es un gasto real —de hecho el costo
  // central de producir hielo—: se registra también como gasto (categoría "servicios")
  // para que golpee la utilidad. Se fecha con el fin del periodo para que caiga en su mes.
  await db.$transaction(async (tx) => {
    await tx.reciboServicio.create({
      data: { tipo, valorCents, consumo, periodoInicio, periodoFin, fotoUrl },
    });
    if (valorCents > 0) {
      await tx.compraGasto.create({
        data: { categoria: "servicios", descripcion: `Servicio: ${tipo}`, valorCents, fecha: periodoFin ?? new Date() },
      });
    }
  });

  revalidatePath("/servicios");
  revalidatePath("/compras");
  revalidatePath("/");
}

export async function actualizarRecibo(formData: FormData) {
  await exigirDueno();
  const id = Number(formData.get("id"));
  if (!id) return;

  const tipo = String(formData.get("tipo") || "energia");
  const valorPesos = Number(formData.get("valorPesos")) || 0;
  const consumo = numeroOpcional(formData.get("consumo"));
  const periodoInicio = fechaLocal(String(formData.get("periodoInicio") ?? ""));
  const periodoFin = fechaLocal(String(formData.get("periodoFin") ?? ""));

  await db.reciboServicio.update({
    where: { id },
    data: { tipo, valorCents: toCents(valorPesos), consumo, periodoInicio, periodoFin },
  });

  revalidatePath("/servicios");
  revalidatePath("/");
}

export async function eliminarRecibo(formData: FormData) {
  await exigirDueno();
  const id = Number(formData.get("id"));
  await db.reciboServicio.delete({ where: { id } });
  revalidatePath("/servicios");
}
