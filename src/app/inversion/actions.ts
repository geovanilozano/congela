"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { revalidatePath } from "next/cache";

export async function crearInversion(formData: FormData) {
  const descripcion = String(formData.get("descripcion") || "");
  const proveedor = String(formData.get("proveedor") || "");
  const valorPesos = Number(formData.get("valorPesos")) || 0;
  const formaPago = String(formData.get("formaPago") || "credito");
  const fecha = formData.get("fecha") ? new Date(String(formData.get("fecha"))) : new Date();

  if (!descripcion) return;

  await db.inversion.create({
    data: {
      descripcion,
      proveedor: proveedor || null,
      valorCents: toCents(valorPesos),
      formaPago,
      fecha,
    },
  });

  revalidatePath("/inversion");
  revalidatePath("/");
}

export async function eliminarInversion(formData: FormData) {
  const id = Number(formData.get("id"));
  const inv = await db.inversion.findUnique({ where: { id } });
  // Si la inversión pertenece a un equipo, se borra desde Activos (no aquí).
  if (!inv || inv.activoId) return;
  await db.inversion.delete({ where: { id } });
  revalidatePath("/inversion");
  revalidatePath("/");
}
