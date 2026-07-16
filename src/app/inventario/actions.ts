"use server";

import { db } from "@/lib/db";
import { aplicarMovimiento, type TipoMovimiento } from "@/lib/inventario";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirRol } from "@/lib/auth/guard";

export async function crearInsumo(formData: FormData) {
  await exigirRol("dueno", "operario");
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
  await exigirRol("dueno", "operario");
  const insumoId = Number(formData.get("insumoId"));
  const cantidad = Number(formData.get("cantidad")) || 0;
  const tipo = (String(formData.get("tipo") || "entrada") === "salida" ? "salida" : "entrada") as TipoMovimiento;

  const insumo = await db.insumoInventario.findUnique({ where: { id: insumoId } });
  if (!insumo) return;

  const mov = aplicarMovimiento(insumo.stock, cantidad, tipo);

  // No se puede sacar más de lo que hay: se avisa en vez de descuadrar el libro.
  if (!mov.ok) {
    if (mov.razon === "sinStock") {
      redirect(`/inventario?error=sinStock&insumo=${insumoId}&hay=${mov.disponible}`);
    }
    return; // cantidad inválida (0 o negativa): sin efecto
  }

  // El stock y el movimiento registrado usan el MISMO delta: siempre cuadran.
  await db.$transaction([
    db.insumoInventario.update({ where: { id: insumoId }, data: { stock: mov.nuevoStock } }),
    db.movimientoInventario.create({
      data: { insumoId, cantidad: mov.delta, concepto: tipo === "salida" ? "Salida" : "Entrada" },
    }),
  ]);
  revalidatePath("/inventario");
}

export async function actualizarInsumo(formData: FormData) {
  await exigirRol("dueno", "operario");
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
  await exigirRol("dueno", "operario");
  await db.insumoInventario.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/inventario");
}
