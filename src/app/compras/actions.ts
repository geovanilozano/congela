"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { guardarFoto } from "@/lib/upload";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fechaLocalODefecto } from "@/lib/fechas";

export async function crearCompra(formData: FormData) {
  const descripcion = String(formData.get("descripcion") || "").trim();
  const valorPesos = Number(formData.get("valorPesos")) || 0;
  if (!descripcion || valorPesos <= 0) redirect("/compras?error=datos");

  const fotoUrl = await guardarFoto(formData.get("foto"));
  await db.compraGasto.create({
    data: {
      categoria: String(formData.get("categoria") || "otro"),
      descripcion,
      proveedor: String(formData.get("proveedor") || "") || null,
      valorCents: toCents(valorPesos),
      fecha: fechaLocalODefecto(formData.get("fecha")),
      fotoUrl,
    },
  });
  revalidatePath("/compras");
  revalidatePath("/");
  redirect("/compras?ok=1");
}

export async function actualizarCompra(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  const descripcion = String(formData.get("descripcion") || "").trim();
  const valorPesos = Number(formData.get("valorPesos")) || 0;
  if (!descripcion || valorPesos <= 0) redirect(`/compras?editar=${id}&error=datos`);

  await db.compraGasto.update({
    where: { id },
    data: {
      categoria: String(formData.get("categoria") || "otro"),
      descripcion,
      proveedor: String(formData.get("proveedor") || "") || null,
      valorCents: toCents(valorPesos),
      fecha: fechaLocalODefecto(formData.get("fecha")),
    },
  });
  revalidatePath("/compras");
  revalidatePath("/");
  redirect("/compras?ok=1");
}

export async function eliminarCompra(formData: FormData) {
  await db.compraGasto.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/compras");
  revalidatePath("/");
}
