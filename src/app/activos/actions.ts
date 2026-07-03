"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { revalidatePath } from "next/cache";

export async function crearActivo(formData: FormData) {
  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) return;
  await db.activo.create({
    data: {
      nombre,
      tipo: String(formData.get("tipo") || "otro"),
      marca: String(formData.get("marca") || "") || null,
      capacidad: String(formData.get("capacidad") || "") || null,
      consumoKwh: formData.get("consumoKwh") ? Number(formData.get("consumoKwh")) : null,
      costoCents: toCents(Number(formData.get("costoPesos")) || 0),
      fechaCompra: formData.get("fechaCompra") ? new Date(String(formData.get("fechaCompra"))) : null,
      garantiaHasta: formData.get("garantiaHasta") ? new Date(String(formData.get("garantiaHasta"))) : null,
      estado: String(formData.get("estado") || "activo"),
      ubicacion: String(formData.get("ubicacion") || "") || null,
    },
  });
  revalidatePath("/activos");
}

export async function eliminarActivo(formData: FormData) {
  await db.activo.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/activos");
}
