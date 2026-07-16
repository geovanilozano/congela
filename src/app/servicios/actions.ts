"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { guardarFoto } from "@/lib/upload";
import { revalidatePath } from "next/cache";
import { fechaLocal } from "@/lib/fechas";
import { exigirDueno } from "@/lib/auth/guard";

export async function registrarRecibo(formData: FormData) {
  await exigirDueno();
  const tipo = String(formData.get("tipo") || "energia");
  const valorPesos = Number(formData.get("valorPesos")) || 0;
  const consumo = formData.get("consumo") ? Number(formData.get("consumo")) : null;
  const periodoInicio = fechaLocal(String(formData.get("periodoInicio") ?? ""));
  const periodoFin = fechaLocal(String(formData.get("periodoFin") ?? ""));

  const fotoUrl = await guardarFoto(formData.get("foto"));

  await db.reciboServicio.create({
    data: { tipo, valorCents: toCents(valorPesos), consumo, periodoInicio, periodoFin, fotoUrl },
  });

  revalidatePath("/servicios");
  revalidatePath("/");
}

export async function actualizarRecibo(formData: FormData) {
  await exigirDueno();
  const id = Number(formData.get("id"));
  if (!id) return;

  const tipo = String(formData.get("tipo") || "energia");
  const valorPesos = Number(formData.get("valorPesos")) || 0;
  const consumo = formData.get("consumo") ? Number(formData.get("consumo")) : null;
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
