"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function crearProduccion(formData: FormData) {
  // Bolsas y pérdidas son unidades enteras: se redondean para no romper la base de datos.
  const bolsas = Math.max(0, Math.round(Number(formData.get("bolsas")) || 0));
  const activoRaw = formData.get("activoId");
  const empleadoRaw = formData.get("empleadoId");
  await db.produccion.create({
    data: {
      fecha: formData.get("fecha") ? new Date(String(formData.get("fecha"))) : new Date(),
      turno: String(formData.get("turno") || "") || null,
      tipo: String(formData.get("tipo") || "cubo"),
      bolsas,
      kilos: formData.get("kilos") ? Number(formData.get("kilos")) : null,
      perdidas: Math.max(0, Math.round(Number(formData.get("perdidas")) || 0)),
      activoId: activoRaw ? Number(activoRaw) || null : null,
      empleadoId: empleadoRaw ? Number(empleadoRaw) || null : null,
      nota: String(formData.get("nota") || "") || null,
    },
  });
  revalidatePath("/produccion");
}

export async function eliminarProduccion(formData: FormData) {
  await db.produccion.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/produccion");
}
