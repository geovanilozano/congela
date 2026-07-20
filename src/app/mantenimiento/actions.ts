"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { revalidatePath } from "next/cache";
import { fechaLocalODefecto } from "@/lib/fechas";
import { exigirRol } from "@/lib/auth/guard";

export async function crearMantenimiento(formData: FormData) {
  await exigirRol("dueno", "operario");
  const descripcion = String(formData.get("descripcion") || "").trim();
  if (!descripcion) return;
  const activoRaw = formData.get("activoId");
  await db.mantenimiento.create({
    data: {
      descripcion,
      tipo: String(formData.get("tipo") || "preventivo"),
      activoId: activoRaw ? Number(activoRaw) || null : null,
      fechaProgramada: fechaLocalODefecto(formData.get("fechaProgramada")),
      costoCents: toCents(Number(formData.get("costoPesos")) || 0),
      nota: String(formData.get("nota") || "") || null,
    },
  });
  revalidatePath("/mantenimiento");
}

export async function actualizarMantenimiento(formData: FormData) {
  await exigirRol("dueno", "operario");
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
      fechaProgramada: fechaLocalODefecto(formData.get("fechaProgramada")),
      costoCents: toCents(Number(formData.get("costoPesos")) || 0),
      nota: String(formData.get("nota") || "") || null,
    },
  });
  revalidatePath("/mantenimiento");
}

export async function marcarRealizado(formData: FormData) {
  await exigirRol("dueno", "operario");
  const id = Number(formData.get("id"));
  const m = await db.mantenimiento.findUnique({ where: { id } });
  if (!m || m.estado === "realizado") return;

  // Marcar realizado y registrar su gasto van juntos: si el gasto fallara, no queremos
  // el mantenimiento marcado como hecho pero sin costo contabilizado.
  await db.$transaction(async (tx) => {
    await tx.mantenimiento.update({
      where: { id },
      data: { estado: "realizado", fechaRealizada: new Date() },
    });
    // Si tuvo costo, se registra automáticamente como gasto de mantenimiento.
    if (m.costoCents > 0) {
      await tx.compraGasto.create({
        data: { categoria: "mantenimiento", descripcion: `Mantenimiento: ${m.descripcion}`, valorCents: m.costoCents },
      });
    }
  });

  revalidatePath("/mantenimiento");
  revalidatePath("/compras");
  revalidatePath("/");
}

export async function eliminarMantenimiento(formData: FormData) {
  await exigirRol("dueno", "operario");
  await db.mantenimiento.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/mantenimiento");
}
