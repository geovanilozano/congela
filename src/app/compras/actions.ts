"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { guardarFoto } from "@/lib/upload";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fechaLocalODefecto } from "@/lib/fechas";
import { exigirRol } from "@/lib/auth/guard";
import { debitarGasto } from "@/lib/finance/gastos";

export async function crearCompra(formData: FormData) {
  await exigirRol("dueno", "cajero");
  const descripcion = String(formData.get("descripcion") || "").trim();
  const valorPesos = Number(formData.get("valorPesos")) || 0;
  if (!descripcion || valorPesos <= 0) redirect("/compras?error=datos");

  const fotoUrl = await guardarFoto(formData.get("foto"));
  const categoria = String(formData.get("categoria") || "otro");
  const valorCents = toCents(valorPesos);

  // El gasto y su DÉBITO al bolsillo van juntos: se registra el gasto y se resta del bolsillo
  // que le corresponde (arriendo→Arriendo, lo demás→Operación). Así los saldos son plata real.
  await db.$transaction(async (tx) => {
    const gasto = await tx.compraGasto.create({
      data: {
        categoria,
        descripcion,
        proveedor: String(formData.get("proveedor") || "") || null,
        valorCents,
        fecha: fechaLocalODefecto(formData.get("fecha")),
        fotoUrl,
      },
    });
    await debitarGasto(tx, gasto.id, categoria, valorCents);
  });

  revalidatePath("/compras");
  revalidatePath("/fondos");
  revalidatePath("/");
  redirect("/compras?ok=1");
}

export async function actualizarCompra(formData: FormData) {
  await exigirRol("dueno", "cajero");
  const id = Number(formData.get("id"));
  if (!id) return;
  const descripcion = String(formData.get("descripcion") || "").trim();
  const valorPesos = Number(formData.get("valorPesos")) || 0;
  if (!descripcion || valorPesos <= 0) redirect(`/compras?editar=${id}&error=datos`);

  const categoria = String(formData.get("categoria") || "otro");
  const valorCents = toCents(valorPesos);

  // Editar puede cambiar el monto Y la categoría (= bolsillo destino). Se borra el débito
  // viejo por gastoId (restaura el bolsillo anterior, sea cual sea) y se rehace con lo nuevo.
  await db.$transaction(async (tx) => {
    await tx.compraGasto.update({
      where: { id },
      data: {
        categoria,
        descripcion,
        proveedor: String(formData.get("proveedor") || "") || null,
        valorCents,
        fecha: fechaLocalODefecto(formData.get("fecha")),
      },
    });
    await tx.movimientoFondo.deleteMany({ where: { gastoId: id } });
    await debitarGasto(tx, id, categoria, valorCents);
  });

  revalidatePath("/compras");
  revalidatePath("/fondos");
  revalidatePath("/");
  redirect("/compras?ok=1");
}

export async function eliminarCompra(formData: FormData) {
  await exigirRol("dueno", "cajero");
  // Al borrar el gasto, su débito se borra en cascada (MovimientoFondo.gastoId onDelete Cascade),
  // así el bolsillo se restaura solo.
  await db.compraGasto.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/compras");
  revalidatePath("/fondos");
  revalidatePath("/");
}
