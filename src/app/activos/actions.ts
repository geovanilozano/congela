"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { revalidatePath } from "next/cache";

export async function crearActivo(formData: FormData) {
  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) return;

  const costoCents = toCents(Number(formData.get("costoPesos")) || 0);
  const proveedor = String(formData.get("proveedor") || "") || null;
  const formaPago = String(formData.get("formaPago") || "credito");
  const fechaCompra = formData.get("fechaCompra") ? new Date(String(formData.get("fechaCompra"))) : null;

  const activo = await db.activo.create({
    data: {
      nombre,
      tipo: String(formData.get("tipo") || "otro"),
      marca: String(formData.get("marca") || "") || null,
      capacidad: String(formData.get("capacidad") || "") || null,
      consumoKwh: formData.get("consumoKwh") ? Number(formData.get("consumoKwh")) : null,
      costoCents,
      fechaCompra,
      garantiaHasta: formData.get("garantiaHasta") ? new Date(String(formData.get("garantiaHasta"))) : null,
      estado: String(formData.get("estado") || "activo"),
      ubicacion: String(formData.get("ubicacion") || "") || null,
    },
  });

  // Si el equipo tiene costo, se registra automáticamente como inversión.
  // Así cada equipo se escribe una sola vez y cuenta para la recuperación de la inversión.
  if (costoCents > 0) {
    await db.inversion.create({
      data: {
        descripcion: nombre,
        proveedor,
        valorCents: costoCents,
        formaPago,
        fecha: fechaCompra ?? new Date(),
        activoId: activo.id,
      },
    });
  }

  revalidatePath("/activos");
  revalidatePath("/inversion");
  revalidatePath("/");
}

export async function eliminarActivo(formData: FormData) {
  // La inversión enlazada se borra en cascada (ver schema.prisma).
  await db.activo.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/activos");
  revalidatePath("/inversion");
  revalidatePath("/");
}
