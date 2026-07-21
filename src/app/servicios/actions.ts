"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { guardarFoto } from "@/lib/upload";
import { revalidatePath } from "next/cache";
import { fechaLocal } from "@/lib/fechas";
import { exigirDueno } from "@/lib/auth/guard";
import { numeroOpcional } from "@/lib/forms";
import { debitarGasto } from "@/lib/finance/gastos";

export async function registrarRecibo(formData: FormData) {
  await exigirDueno();
  const tipo = String(formData.get("tipo") || "energia");
  const valorPesos = Number(formData.get("valorPesos")) || 0;
  const consumo = numeroOpcional(formData.get("consumo"));
  const periodoInicio = fechaLocal(String(formData.get("periodoInicio") ?? ""));
  const periodoFin = fechaLocal(String(formData.get("periodoFin") ?? ""));
  const valorCents = toCents(valorPesos);

  const fotoUrl = await guardarFoto(formData.get("foto"));

  // El recibo de servicios (energía, agua, gas…) es un gasto real —de hecho el costo
  // central de producir hielo—: se registra también como gasto (categoría "servicios")
  // para que golpee la utilidad. Se fecha con el fin del periodo para que caiga en su mes.
  await db.$transaction(async (tx) => {
    const recibo = await tx.reciboServicio.create({
      data: { tipo, valorCents, consumo, periodoInicio, periodoFin, fotoUrl },
    });
    if (valorCents > 0) {
      const gasto = await tx.compraGasto.create({
        data: {
          categoria: "servicios",
          descripcion: `Servicio: ${tipo}`,
          valorCents,
          fecha: periodoFin ?? new Date(),
          reciboServicioId: recibo.id, // enlace al origen: borrar el recibo borra el gasto y su débito
        },
      });
      await debitarGasto(tx, gasto.id, "servicios", valorCents);
    }
  });

  revalidatePath("/servicios");
  revalidatePath("/compras");
  revalidatePath("/fondos");
  revalidatePath("/");
}

export async function actualizarRecibo(formData: FormData) {
  await exigirDueno();
  const id = Number(formData.get("id"));
  if (!id) return;

  const tipo = String(formData.get("tipo") || "energia");
  const valorPesos = Number(formData.get("valorPesos")) || 0;
  const consumo = numeroOpcional(formData.get("consumo"));
  const periodoInicio = fechaLocal(String(formData.get("periodoInicio") ?? ""));
  const periodoFin = fechaLocal(String(formData.get("periodoFin") ?? ""));
  const valorCents = toCents(valorPesos);

  // Editar el recibo también sincroniza su gasto espejo y el débito al bolsillo. Cubre las
  // transiciones: de 0 a positivo (crear espejo+débito), de positivo a 0 (borrar espejo, la
  // cascada quita su débito) y cambio de monto (rehacer el débito).
  await db.$transaction(async (tx) => {
    await tx.reciboServicio.update({
      where: { id },
      data: { tipo, valorCents, consumo, periodoInicio, periodoFin },
    });
    const espejo = await tx.compraGasto.findFirst({ where: { reciboServicioId: id } });
    if (valorCents > 0) {
      if (espejo) {
        await tx.compraGasto.update({
          where: { id: espejo.id },
          data: { valorCents, descripcion: `Servicio: ${tipo}`, fecha: periodoFin ?? espejo.fecha },
        });
        await tx.movimientoFondo.deleteMany({ where: { gastoId: espejo.id } });
        await debitarGasto(tx, espejo.id, "servicios", valorCents);
      } else {
        const gasto = await tx.compraGasto.create({
          data: { categoria: "servicios", descripcion: `Servicio: ${tipo}`, valorCents, fecha: periodoFin ?? new Date(), reciboServicioId: id },
        });
        await debitarGasto(tx, gasto.id, "servicios", valorCents);
      }
    } else if (espejo) {
      // El recibo pasó a $0: se quita el gasto espejo (y en cascada su débito).
      await tx.compraGasto.delete({ where: { id: espejo.id } });
    }
  });

  revalidatePath("/servicios");
  revalidatePath("/compras");
  revalidatePath("/fondos");
  revalidatePath("/");
}

export async function eliminarRecibo(formData: FormData) {
  await exigirDueno();
  const id = Number(formData.get("id"));
  // Cascada: borrar el recibo borra su gasto espejo y, con él, el débito al bolsillo.
  await db.reciboServicio.delete({ where: { id } });
  revalidatePath("/servicios");
  revalidatePath("/compras");
  revalidatePath("/fondos");
  revalidatePath("/");
}
