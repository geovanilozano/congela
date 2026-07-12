"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function crearInsumo(formData: FormData) {
  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) return;
  const stock = Number(formData.get("stock")) || 0;
  const insumo = await db.insumoInventario.create({
    data: {
      nombre,
      unidad: String(formData.get("unidad") || "unidad"),
      stock,
      stockMinimo: Number(formData.get("stockMinimo")) || 0,
    },
  });
  if (stock > 0) {
    await db.movimientoInventario.create({
      data: { insumoId: insumo.id, cantidad: stock, concepto: "Stock inicial" },
    });
  }
  revalidatePath("/inventario");
}

export async function moverInventario(formData: FormData) {
  const insumoId = Number(formData.get("insumoId"));
  const cantidad = Number(formData.get("cantidad")) || 0;
  const tipo = String(formData.get("tipo") || "entrada"); // entrada | salida
  if (cantidad <= 0) return;

  const delta = tipo === "salida" ? -cantidad : cantidad;
  const insumo = await db.insumoInventario.findUnique({ where: { id: insumoId } });
  if (!insumo) return;

  const nuevoStock = Math.max(0, insumo.stock + delta);
  await db.insumoInventario.update({ where: { id: insumoId }, data: { stock: nuevoStock } });
  await db.movimientoInventario.create({
    data: { insumoId, cantidad: delta, concepto: tipo === "salida" ? "Salida" : "Entrada" },
  });
  revalidatePath("/inventario");
}

export async function actualizarInsumo(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) return;
  await db.insumoInventario.update({
    where: { id },
    data: {
      nombre,
      unidad: String(formData.get("unidad") || "unidad"),
      stockMinimo: Number(formData.get("stockMinimo")) || 0,
    },
  });
  revalidatePath("/inventario");
}

export async function eliminarInsumo(formData: FormData) {
  await db.insumoInventario.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/inventario");
}
