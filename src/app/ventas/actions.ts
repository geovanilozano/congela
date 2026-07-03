"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { revalidatePath } from "next/cache";

export async function crearVenta(formData: FormData) {
  const clienteNombre = String(formData.get("clienteNombre") || "").trim();
  const descripcion = String(formData.get("descripcion") || "Hielo");
  const cantidad = Number(formData.get("cantidad")) || 1;
  const precioPesos = Number(formData.get("precioPesos")) || 0;
  const formaPago = String(formData.get("formaPago") || "contado");

  const precioUnitCents = toCents(precioPesos);
  const subtotalCents = precioUnitCents * cantidad;

  let clienteId: number | null = null;
  if (clienteNombre) {
    const existente = await db.cliente.findFirst({ where: { nombre: clienteNombre } });
    clienteId = existente
      ? existente.id
      : (await db.cliente.create({ data: { nombre: clienteNombre, tipo: formaPago } })).id;
  }

  await db.venta.create({
    data: {
      clienteId,
      totalCents: subtotalCents,
      formaPago,
      items: {
        create: [{ descripcion, cantidad, precioUnitCents, subtotalCents }],
      },
    },
  });

  revalidatePath("/ventas");
  revalidatePath("/caja");
  revalidatePath("/");
}

export async function eliminarVenta(formData: FormData) {
  const id = Number(formData.get("id"));
  const venta = await db.venta.findUnique({ where: { id } });
  if (venta?.cierreId) return; // no borrar ventas ya cerradas en caja
  await db.venta.delete({ where: { id } });
  revalidatePath("/ventas");
  revalidatePath("/caja");
}
