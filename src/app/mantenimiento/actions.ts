"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { revalidatePath } from "next/cache";
import { fechaLocalODefecto } from "@/lib/fechas";
import { exigirRol } from "@/lib/auth/guard";
import { debitarGasto } from "@/lib/finance/gastos";

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
  const costoCents = toCents(Number(formData.get("costoPesos")) || 0);

  // Si el mantenimiento YA está realizado, tiene un gasto espejo con su débito: al editar el
  // costo hay que sincronizarlos (si no, el gasto y el bolsillo quedarían con el valor viejo).
  await db.$transaction(async (tx) => {
    const previo = await tx.mantenimiento.findUnique({ where: { id }, select: { estado: true } });
    await tx.mantenimiento.update({
      where: { id },
      data: {
        descripcion,
        tipo: String(formData.get("tipo") || "preventivo"),
        activoId: activoRaw ? Number(activoRaw) || null : null,
        fechaProgramada: fechaLocalODefecto(formData.get("fechaProgramada")),
        costoCents,
        nota: String(formData.get("nota") || "") || null,
      },
    });

    if (previo?.estado === "realizado") {
      const espejo = await tx.compraGasto.findFirst({ where: { mantenimientoId: id } });
      if (costoCents > 0) {
        if (espejo) {
          await tx.compraGasto.update({ where: { id: espejo.id }, data: { valorCents: costoCents, descripcion: `Mantenimiento: ${descripcion}` } });
          await tx.movimientoFondo.deleteMany({ where: { gastoId: espejo.id } });
          await debitarGasto(tx, espejo.id, "mantenimiento", costoCents);
        } else {
          const gasto = await tx.compraGasto.create({
            data: { categoria: "mantenimiento", descripcion: `Mantenimiento: ${descripcion}`, valorCents: costoCents, mantenimientoId: id },
          });
          await debitarGasto(tx, gasto.id, "mantenimiento", costoCents);
        }
      } else if (espejo) {
        await tx.compraGasto.delete({ where: { id: espejo.id } }); // costo a $0: cascada quita el débito
      }
    }
  });

  revalidatePath("/mantenimiento");
  revalidatePath("/compras");
  revalidatePath("/fondos");
  revalidatePath("/");
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
    // Si tuvo costo, se registra automáticamente como gasto de mantenimiento y se debita del bolsillo.
    if (m.costoCents > 0) {
      const gasto = await tx.compraGasto.create({
        data: {
          categoria: "mantenimiento",
          descripcion: `Mantenimiento: ${m.descripcion}`,
          valorCents: m.costoCents,
          mantenimientoId: id, // enlace al origen: borrar el mantenimiento borra el gasto y su débito
        },
      });
      await debitarGasto(tx, gasto.id, "mantenimiento", m.costoCents);
    }
  });

  revalidatePath("/mantenimiento");
  revalidatePath("/compras");
  revalidatePath("/fondos");
  revalidatePath("/");
}

export async function eliminarMantenimiento(formData: FormData) {
  await exigirRol("dueno", "operario");
  // Cascada: borrar el mantenimiento borra su gasto espejo (si estaba realizado) y su débito.
  await db.mantenimiento.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/mantenimiento");
  revalidatePath("/compras");
  revalidatePath("/fondos");
  revalidatePath("/");
}
