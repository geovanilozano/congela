"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { fechaLocalODefecto } from "@/lib/fechas";
import { exigirRol } from "@/lib/auth/guard";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Efecto de UNA producción sobre el inventario: consume los insumos de la receta del producto
 * y sube el stock de producto terminado. `signo` = +1 al producir, −1 al revertir (editar/borrar).
 * Permite que el stock quede negativo (el aviso de stock bajo lo evidencia); NO bloquea la
 * producción por falta de insumos, porque físicamente ya se produjo.
 */
async function aplicarEfectoProduccion(
  tx: Prisma.TransactionClient,
  productoId: number | null,
  bolsas: number,
  signo: 1 | -1,
): Promise<void> {
  if (!productoId || bolsas <= 0) return;

  const receta = await tx.recetaItem.findMany({ where: { productoId } });
  for (const r of receta) {
    const delta = -signo * r.cantidad * bolsas; // producir consume (−), revertir devuelve (+)
    const insumo = await tx.insumoInventario.findUnique({ where: { id: r.insumoId }, select: { stock: true } });
    if (!insumo) continue;
    await tx.insumoInventario.update({ where: { id: r.insumoId }, data: { stock: insumo.stock + delta } });
    await tx.movimientoInventario.create({
      data: { insumoId: r.insumoId, cantidad: delta, concepto: signo > 0 ? "Producción" : "Producción (revertida)" },
    });
  }

  const prod = await tx.producto.findUnique({ where: { id: productoId }, select: { stock: true } });
  if (prod) await tx.producto.update({ where: { id: productoId }, data: { stock: prod.stock + signo * bolsas } });
}

function leerCampos(formData: FormData) {
  const productoRaw = formData.get("productoId");
  const activoRaw = formData.get("activoId");
  const empleadoRaw = formData.get("empleadoId");
  return {
    fecha: fechaLocalODefecto(formData.get("fecha")),
    turno: String(formData.get("turno") || "") || null,
    tipo: String(formData.get("tipo") || "cubo"),
    // Bolsas y pérdidas son unidades enteras: se redondean para no romper la base de datos.
    bolsas: Math.max(0, Math.round(Number(formData.get("bolsas")) || 0)),
    kilos: formData.get("kilos") ? Number(formData.get("kilos")) : null,
    perdidas: Math.max(0, Math.round(Number(formData.get("perdidas")) || 0)),
    activoId: activoRaw ? Number(activoRaw) || null : null,
    empleadoId: empleadoRaw ? Number(empleadoRaw) || null : null,
    productoId: productoRaw ? Number(productoRaw) || null : null,
    nota: String(formData.get("nota") || "") || null,
  };
}

export async function crearProduccion(formData: FormData) {
  await exigirRol("dueno", "operario");
  const d = leerCampos(formData);
  await db.$transaction(async (tx) => {
    await tx.produccion.create({ data: d });
    await aplicarEfectoProduccion(tx, d.productoId, d.bolsas, 1);
  });
  revalidatePath("/produccion");
  revalidatePath("/productos");
  revalidatePath("/inventario");
  revalidatePath("/");
}

export async function actualizarProduccion(formData: FormData) {
  await exigirRol("dueno", "operario");
  const id = Number(formData.get("id"));
  if (!id) return;
  const d = leerCampos(formData);
  await db.$transaction(async (tx) => {
    // Revertir el efecto de los datos ANTERIORES antes de aplicar los nuevos.
    const previa = await tx.produccion.findUnique({ where: { id }, select: { productoId: true, bolsas: true } });
    if (previa) await aplicarEfectoProduccion(tx, previa.productoId, previa.bolsas, -1);
    await tx.produccion.update({ where: { id }, data: d });
    await aplicarEfectoProduccion(tx, d.productoId, d.bolsas, 1);
  });
  revalidatePath("/produccion");
  revalidatePath("/productos");
  revalidatePath("/inventario");
  revalidatePath("/");
}

export async function eliminarProduccion(formData: FormData) {
  await exigirRol("dueno", "operario");
  const id = Number(formData.get("id"));
  if (!id) return;
  await db.$transaction(async (tx) => {
    // Al borrar, se devuelven los insumos consumidos y se baja el stock de producto que había subido.
    const previa = await tx.produccion.findUnique({ where: { id }, select: { productoId: true, bolsas: true } });
    if (previa) await aplicarEfectoProduccion(tx, previa.productoId, previa.bolsas, -1);
    await tx.produccion.delete({ where: { id } });
  });
  revalidatePath("/produccion");
  revalidatePath("/productos");
  revalidatePath("/inventario");
  revalidatePath("/");
}
