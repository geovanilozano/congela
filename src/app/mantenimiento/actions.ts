"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { revalidatePath } from "next/cache";

export async function crearMantenimiento(formData: FormData) {
  const descripcion = String(formData.get("descripcion") || "").trim();
  if (!descripcion) return;
  const activoRaw = formData.get("activoId");
  await db.mantenimiento.create({
    data: {
      descripcion,
      tipo: String(formData.get("tipo") || "preventivo"),
      activoId: activoRaw ? Number(activoRaw) || null : null,
      fechaProgramada: formData.get("fechaProgramada")
        ? new Date(String(formData.get("fechaProgramada")))
        : new Date(),
      costoCents: toCents(Number(formData.get("costoPesos")) || 0),
      nota: String(formData.get("nota") || "") || null,
    },
  });
  revalidatePath("/mantenimiento");
}

export async function actualizarMantenimiento(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  const descripcion = String(formData.get("descripcion") || "").trim();
  if (!descripcion) return;
  const activoRaw = formData.get("activoId");
  await db.mantenimiento.update({
    where: { id },
    data: {
      descripcion,
      tipo: String(formData.get("tipo") || "preventivo"),
      activoId: activoRaw ? Number(activoRaw) || null : null,
      fechaProgramada: formData.get("fechaProgramada")
        ? new Date(String(formData.get("fechaProgramada")))
        : new Date(),
      costoCents: toCents(Number(formData.get("costoPesos")) || 0),
      nota: String(formData.get("nota") || "") || null,
    },
  });
  revalidatePath("/mantenimiento");
}

export async function marcarRealizado(formData: FormData) {
  const id = Number(formData.get("id"));
  const m = await db.mantenimiento.findUnique({ where: { id } });
  if (!m || m.estado === "realizado") return;

  await db.mantenimiento.update({
    where: { id },
    data: { estado: "realizado", fechaRealizada: new Date() },
  });

  // Si tuvo costo, se registra automáticamente como gasto de mantenimiento.
  if (m.costoCents > 0) {
    await db.compraGasto.create({
      data: { categoria: "mantenimiento", descripcion: `Mantenimiento: ${m.descripcion}`, valorCents: m.costoCents },
    });
    revalidatePath("/compras");
    revalidatePath("/");
  }

  revalidatePath("/mantenimiento");
}

export async function eliminarMantenimiento(formData: FormData) {
  await db.mantenimiento.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/mantenimiento");
}
