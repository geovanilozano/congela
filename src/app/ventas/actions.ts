"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { fechaLocalODefecto } from "@/lib/fechas";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirRol } from "@/lib/auth/guard";
import { auditar, conMonto } from "@/lib/auditoria";
import { resolverClienteId } from "@/lib/clientes-db";

export async function crearVenta(formData: FormData) {
  await exigirRol("dueno", "cajero");
  const clienteNombre = String(formData.get("clienteNombre") || "").trim();
  const descripcion = String(formData.get("descripcion") || "Hielo");
  // Las bolsas son unidades enteras: se redondea para no romper la base de datos.
  const cantidad = Math.max(1, Math.round(Number(formData.get("cantidad")) || 1));
  const precioPesos = Number(formData.get("precioPesos")) || 0;
  const formaPago = String(formData.get("formaPago") || "contado");
  const fecha = fechaLocalODefecto(formData.get("fecha"));

  // Sin precio no hay venta: se avisa en vez de guardar una venta de $0 que descuadra el cierre.
  if (precioPesos <= 0) redirect("/ventas?error=precio");

  const precioUnitCents = toCents(precioPesos);
  const subtotalCents = precioUnitCents * cantidad;
  const clienteId = await resolverClienteId(clienteNombre, formaPago);

  await db.venta.create({
    data: {
      clienteId,
      fecha,
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
 * Edita una venta ya registrada (fecha, producto, cantidad, precio, cliente, forma de pago).
 * No toca ventas ya cerradas en caja, para no descuadrar los fondos.
 */
export async function actualizarVenta(formData: FormData) {
  await exigirRol("dueno", "cajero");
  const id = Number(formData.get("id"));
  const venta = await db.venta.findUnique({ where: { id } });
  if (!venta || venta.cierreId) return; // no se editan ventas ya repartidas en fondos

  const clienteNombre = String(formData.get("clienteNombre") || "").trim();
  const descripcion = String(formData.get("descripcion") || "Hielo");
  const cantidad = Math.max(1, Math.round(Number(formData.get("cantidad")) || 1));
  const precioPesos = Number(formData.get("precioPesos")) || 0;
  const formaPago = String(formData.get("formaPago") || "contado");
  const fecha = fechaLocalODefecto(formData.get("fecha"));

  if (precioPesos <= 0) redirect(`/ventas?editar=${id}&error=precio`);

  const precioUnitCents = toCents(precioPesos);
  const subtotalCents = precioUnitCents * cantidad;
  const clienteId = await resolverClienteId(clienteNombre, formaPago);

  // Contado = pagada (sin fecha de cobro). Crédito = conserva si el fiado ya estaba cobrado.
  const esContado = formaPago === "contado";
  const pagada = esContado ? true : venta.pagada;
  const pagadaEn = esContado ? null : venta.pagadaEn;

  await db.venta.update({
    where: { id },
    data: {
      clienteId,
      fecha,
      totalCents: subtotalCents,
      formaPago,
      pagada,
      pagadaEn,
      items: {
        deleteMany: {}, // se reemplaza el único ítem por el editado
        create: [{ descripcion, cantidad, precioUnitCents, subtotalCents }],
      },
    },
  });

  await auditar({ accion: "actualizar", entidad: "venta", entidadId: id, detalle: conMonto(`Venta #${id}`, subtotalCents) });

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
  await exigirRol("dueno", "cajero");
  const id = Number(formData.get("id"));
  const venta = await db.venta.findUnique({ where: { id } });
  if (!venta || venta.formaPago !== "credito" || venta.pagada) return;

  await db.venta.update({ where: { id }, data: { pagada: true, pagadaEn: new Date() } });
  revalidatePath("/clientes");
  revalidatePath("/ventas");
  revalidatePath("/");
}

export async function eliminarVenta(formData: FormData) {
  await exigirRol("dueno", "cajero");
  const id = Number(formData.get("id"));
  const venta = await db.venta.findUnique({ where: { id } });
  if (!venta || venta.cierreId) return; // no borrar ventas ya cerradas en caja
  await db.venta.delete({ where: { id } });
  await auditar({ accion: "eliminar", entidad: "venta", entidadId: id, detalle: conMonto(`Venta #${id}`, venta.totalCents) });
  revalidatePath("/ventas");
  revalidatePath("/caja");
}
