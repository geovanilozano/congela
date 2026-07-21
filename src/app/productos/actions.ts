"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirRol } from "@/lib/auth/guard";

export async function crearProducto(formData: FormData) {
  await exigirRol("dueno", "operario");
  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) redirect("/productos?error=nombre");
  const existe = await db.producto.findFirst({ where: { nombre: { equals: nombre, mode: "insensitive" } } });
  if (existe) redirect("/productos?error=duplicado");

  const precioPesos = Number(formData.get("precioPesos")) || 0;
  await db.producto.create({
    data: {
      nombre,
      unidad: String(formData.get("unidad") || "bolsa"),
      precioSugeridoCents: precioPesos > 0 ? toCents(precioPesos) : null,
      stockMinimo: Number(formData.get("stockMinimo")) || 0,
    },
  });
  revalidatePath("/productos");
  redirect("/productos?ok=1");
}

export async function actualizarProducto(formData: FormData) {
  await exigirRol("dueno", "operario");
  const id = Number(formData.get("id"));
  if (!id) return;
  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) redirect(`/productos?editar=${id}&error=nombre`);
  const precioPesos = Number(formData.get("precioPesos")) || 0;
  await db.producto.update({
    where: { id },
    data: {
      nombre,
      unidad: String(formData.get("unidad") || "bolsa"),
      precioSugeridoCents: precioPesos > 0 ? toCents(precioPesos) : null,
      stockMinimo: Number(formData.get("stockMinimo")) || 0,
      activo: formData.get("activo") === "on",
    },
  });
  revalidatePath("/productos");
  redirect("/productos?ok=1");
}

export async function eliminarProducto(formData: FormData) {
  await exigirRol("dueno", "operario");
  // Cascada: borra su receta. Las ventas/producciones ligadas quedan con productoId=null
  // (conservan su descripción como copia), así el historial no se pierde.
  await db.producto.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/productos");
}

/** Agrega (o actualiza) una línea de receta: cuánto de un insumo consume una unidad del producto. */
export async function guardarRecetaItem(formData: FormData) {
  await exigirRol("dueno", "operario");
  const productoId = Number(formData.get("productoId"));
  const insumoId = Number(formData.get("insumoId"));
  const cantidad = Number(formData.get("cantidad")) || 0;
  if (!productoId || !insumoId || cantidad <= 0) redirect(`/productos?editar=${productoId}&error=receta`);

  await db.recetaItem.upsert({
    where: { productoId_insumoId: { productoId, insumoId } },
    update: { cantidad },
    create: { productoId, insumoId, cantidad },
  });
  revalidatePath("/productos");
  redirect(`/productos?editar=${productoId}`);
}

export async function eliminarRecetaItem(formData: FormData) {
  await exigirRol("dueno", "operario");
  const id = Number(formData.get("id"));
  const productoId = Number(formData.get("productoId"));
  if (id) await db.recetaItem.delete({ where: { id } });
  revalidatePath("/productos");
  redirect(`/productos?editar=${productoId}`);
}
