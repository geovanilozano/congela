"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function crearVenta(formData: FormData) {
  const clienteNombre = String(formData.get("clienteNombre") || "").trim();
  const descripcion = String(formData.get("descripcion") || "Hielo");
  // Las bolsas son unidades enteras: se redondea para no romper la base de datos.
  const cantidad = Math.max(1, Math.round(Number(formData.get("cantidad")) || 1));
  const precioPesos = Number(formData.get("precioPesos")) || 0;
  const formaPago = String(formData.get("formaPago") || "contado");

  // Sin precio no hay venta: se avisa en vez de guardar una venta de $0 que descuadra el cierre.
  if (precioPesos <= 0) redirect("/ventas?error=precio");

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
      // El contado nace pagado; el fiado nace por cobrar hasta que el cliente pague.
      pagada: formaPago === "contado",
      items: {
        create: [{ descripcion, cantidad, precioUnitCents, subtotalCents }],
      },
    },
  });

  revalidatePath("/ventas");
  revalidatePath("/caja");
  revalidatePath("/");
  redirect("/ventas?ok=1");
}

/**
 * Registra que un cliente pagó una venta a crédito (fiado). Solo cierra la cuenta por
 * cobrar; no mueve dinero, porque el fiado ya entró al cierre de caja.
 */
export async function registrarPagoCliente(formData: FormData) {
  const id = Number(formData.get("id"));
  const venta = await db.venta.findUnique({ where: { id } });
  if (!venta || venta.formaPago !== "credito" || venta.pagada) return;

  await db.venta.update({ where: { id }, data: { pagada: true, pagadaEn: new Date() } });
  revalidatePath("/clientes");
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
