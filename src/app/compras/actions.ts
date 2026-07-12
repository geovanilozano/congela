"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { guardarFoto } from "@/lib/upload";
import { revalidatePath } from "next/cache";

export async function crearCompra(formData: FormData) {
  const descripcion = String(formData.get("descripcion") || "").trim();
  if (!descripcion) return;
  const fotoUrl = await guardarFoto(formData.get("foto"));
  await db.compraGasto.create({
    data: {
      categoria: String(formData.get("categoria") || "otro"),
      descripcion,
      proveedor: String(formData.get("proveedor") || "") || null,
      valorCents: toCents(Number(formData.get("valorPesos")) || 0),
      fecha: formData.get("fecha") ? new Date(String(formData.get("fecha"))) : new Date(),
      fotoUrl,
    },
  });
  revalidatePath("/compras");
  revalidatePath("/");
}

export async function actualizarCompra(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  const descripcion = String(formData.get("descripcion") || "").trim();
  if (!descripcion) return;
  await db.compraGasto.update({
    where: { id },
    data: {
      categoria: String(formData.get("categoria") || "otro"),
      descripcion,
      proveedor: String(formData.get("proveedor") || "") || null,
      valorCents: toCents(Number(formData.get("valorPesos")) || 0),
      fecha: formData.get("fecha") ? new Date(String(formData.get("fecha"))) : new Date(),
    },
  });
  revalidatePath("/compras");
  revalidatePath("/");
}

export async function eliminarCompra(formData: FormData) {
  await db.compraGasto.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/compras");
  revalidatePath("/");
}
