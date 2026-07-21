"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { revalidatePath } from "next/cache";
import { fechaLocal } from "@/lib/fechas";
import { exigirDueno } from "@/lib/auth/guard";
import { numeroOpcional } from "@/lib/forms";

export async function crearActivo(formData: FormData) {
  await exigirDueno();
  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) return;

  const costoCents = toCents(Number(formData.get("costoPesos")) || 0);
  const proveedor = String(formData.get("proveedor") || "") || null;
  const formaPago = String(formData.get("formaPago") || "credito");
  const fechaCompra = fechaLocal(String(formData.get("fechaCompra") ?? ""));

  // El activo y su inversión ligada se crean juntos (transacción): si la inversión fallara,
  // no queremos un equipo sin su registro de inversión (o al revés).
  await db.$transaction(async (tx) => {
    const activo = await tx.activo.create({
      data: {
        nombre,
        tipo: String(formData.get("tipo") || "otro"),
        marca: String(formData.get("marca") || "") || null,
        capacidad: String(formData.get("capacidad") || "") || null,
        consumoKwh: numeroOpcional(formData.get("consumoKwh")),
        costoCents,
        fechaCompra,
        garantiaHasta: fechaLocal(String(formData.get("garantiaHasta") ?? "")),
        estado: String(formData.get("estado") || "activo"),
        ubicacion: String(formData.get("ubicacion") || "") || null,
      },
    });

    // Si el equipo tiene costo, se registra automáticamente como inversión.
    // Así cada equipo se escribe una sola vez y cuenta para la recuperación de la inversión.
    if (costoCents > 0) {
      await tx.inversion.create({
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
  });

  revalidatePath("/activos");
  revalidatePath("/inversion");
  revalidatePath("/");
}

export async function actualizarActivo(formData: FormData) {
  await exigirDueno();
  const id = Number(formData.get("id"));
  if (!id) return;

  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) return;

  const costoCents = toCents(Number(formData.get("costoPesos")) || 0);
  const proveedor = String(formData.get("proveedor") || "") || null;
  const formaPago = String(formData.get("formaPago") || "credito");
  const fechaCompra = fechaLocal(String(formData.get("fechaCompra") ?? ""));

  // La actualización del activo y la sincronización de su inversión ligada van juntas.
  await db.$transaction(async (tx) => {
    await tx.activo.update({
      where: { id },
      data: {
        nombre,
        tipo: String(formData.get("tipo") || "otro"),
        marca: String(formData.get("marca") || "") || null,
        capacidad: String(formData.get("capacidad") || "") || null,
        consumoKwh: numeroOpcional(formData.get("consumoKwh")),
        costoCents,
        fechaCompra,
        garantiaHasta: fechaLocal(String(formData.get("garantiaHasta") ?? "")),
        estado: String(formData.get("estado") || "activo"),
        ubicacion: String(formData.get("ubicacion") || "") || null,
      },
    });

    // Sincroniza la inversión ligada al activo, para no duplicar el registro.
    const inv = await tx.inversion.findUnique({ where: { activoId: id } });

    if (costoCents > 0 && inv) {
      await tx.inversion.update({
        where: { id: inv.id },
        data: { descripcion: nombre, proveedor, valorCents: costoCents, formaPago, fecha: fechaCompra ?? inv.fecha },
      });
    } else if (costoCents > 0 && !inv) {
      await tx.inversion.create({
        data: { descripcion: nombre, proveedor, valorCents: costoCents, formaPago, fecha: fechaCompra ?? new Date(), activoId: id },
      });
    } else if (costoCents === 0 && inv) {
      await tx.inversion.delete({ where: { id: inv.id } });
    }
  });

  revalidatePath("/activos");
  revalidatePath("/inversion");
  revalidatePath("/");
}

export async function eliminarActivo(formData: FormData) {
  await exigirDueno();
  // La inversión enlazada se borra en cascada (ver schema.prisma).
  await db.activo.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/activos");
  revalidatePath("/inversion");
  revalidatePath("/");
}
