"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { fechaLocalODefecto } from "@/lib/fechas";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirRol } from "@/lib/auth/guard";
import { auditar, conMonto } from "@/lib/auditoria";
import { resolverClienteId } from "@/lib/clientes-db";
import type { Prisma } from "@/generated/prisma/client";

/** Ajusta el stock de un producto (vender resta, revertir suma). Permite negativo = se vendió
 *  más de lo producido (el aviso de stock bajo lo evidencia). */
async function ajustarStockProducto(tx: Prisma.TransactionClient, productoId: number, delta: number) {
  const p = await tx.producto.findUnique({ where: { id: productoId }, select: { stock: true } });
  if (p) await tx.producto.update({ where: { id: productoId }, data: { stock: p.stock + delta } });
}

/** Resuelve el producto elegido: devuelve su id y su nombre (para copiar como descripción). */
async function resolverProducto(productoIdRaw: FormDataEntryValue | null): Promise<{ productoId: number | null; nombre: string | null }> {
  const id = productoIdRaw ? Number(productoIdRaw) || null : null;
  if (!id) return { productoId: null, nombre: null };
  const p = await db.producto.findUnique({ where: { id }, select: { nombre: true } });
  return p ? { productoId: id, nombre: p.nombre } : { productoId: null, nombre: null };
}

export async function crearVenta(formData: FormData) {
  await exigirRol("dueno", "cajero");
  const clienteNombre = String(formData.get("clienteNombre") || "").trim();
  // Las bolsas son unidades enteras: se redondea para no romper la base de datos.
  const cantidad = Math.max(1, Math.round(Number(formData.get("cantidad")) || 1));
  const precioPesos = Number(formData.get("precioPesos")) || 0;
  const formaPago = String(formData.get("formaPago") || "contado");
  const fecha = fechaLocalODefecto(formData.get("fecha"));

  // Sin precio no hay venta: se avisa en vez de guardar una venta de $0 que descuadra el cierre.
  if (precioPesos <= 0) redirect("/ventas?error=precio");
  // El fiado SIN cliente crea un "por cobrar" fantasma: suma a lo que te deben pero no queda
  // bajo ningún cliente, así que nunca se puede cobrar ni saldar. Se exige el nombre.
  if (formaPago === "credito" && !clienteNombre) redirect("/ventas?error=fiadoSinCliente");

  // Si se eligió un producto del catálogo, su nombre se copia como descripción (snapshot) y su
  // stock se descuenta. Si no, se usa el texto libre y no se toca stock (retrocompat).
  const { productoId, nombre } = await resolverProducto(formData.get("productoId"));
  const descripcion = productoId && nombre ? nombre : String(formData.get("descripcion") || "Hielo").trim() || "Hielo";

  const precioUnitCents = toCents(precioPesos);
  const subtotalCents = precioUnitCents * cantidad;
  const clienteId = await resolverClienteId(clienteNombre, formaPago);

  await db.$transaction(async (tx) => {
    await tx.venta.create({
      data: {
        clienteId,
        fecha,
        totalCents: subtotalCents,
        formaPago,
        // El contado nace pagado; el fiado nace por cobrar hasta que el cliente pague.
        pagada: formaPago === "contado",
        items: {
          create: [{ descripcion, cantidad, precioUnitCents, subtotalCents, productoId }],
        },
      },
    });
    if (productoId) await ajustarStockProducto(tx, productoId, -cantidad);
  });

  revalidatePath("/ventas");
  revalidatePath("/caja");
  revalidatePath("/productos");
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
  const venta = await db.venta.findUnique({ where: { id }, include: { items: true } });
  if (!venta || venta.cierreId) return; // no se editan ventas ya repartidas en fondos

  const clienteNombre = String(formData.get("clienteNombre") || "").trim();
  const cantidad = Math.max(1, Math.round(Number(formData.get("cantidad")) || 1));
  const precioPesos = Number(formData.get("precioPesos")) || 0;
  const formaPago = String(formData.get("formaPago") || "contado");
  const fecha = fechaLocalODefecto(formData.get("fecha"));

  if (precioPesos <= 0) redirect(`/ventas?editar=${id}&error=precio`);
  if (formaPago === "credito" && !clienteNombre) redirect(`/ventas?editar=${id}&error=fiadoSinCliente`);

  const { productoId, nombre } = await resolverProducto(formData.get("productoId"));
  const descripcion = productoId && nombre ? nombre : String(formData.get("descripcion") || "Hielo").trim() || "Hielo";

  const precioUnitCents = toCents(precioPesos);
  const subtotalCents = precioUnitCents * cantidad;
  const clienteId = await resolverClienteId(clienteNombre, formaPago);

  // Contado = pagada (sin fecha de cobro). Crédito = conserva si el fiado ya estaba cobrado.
  const esContado = formaPago === "contado";
  const pagada = esContado ? true : venta.pagada;
  const pagadaEn = esContado ? null : venta.pagadaEn;

  await db.$transaction(async (tx) => {
    // Revertir el descuento de stock del/los ítem(s) ANTERIOR(es) antes de reemplazarlos.
    for (const it of venta.items) {
      if (it.productoId) await ajustarStockProducto(tx, it.productoId, it.cantidad);
    }
    await tx.venta.update({
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
          create: [{ descripcion, cantidad, precioUnitCents, subtotalCents, productoId }],
        },
      },
    });
    if (productoId) await ajustarStockProducto(tx, productoId, -cantidad);
  });

  await auditar({ accion: "actualizar", entidad: "venta", entidadId: id, detalle: conMonto(`Venta #${id}`, subtotalCents) });

  revalidatePath("/ventas");
  revalidatePath("/caja");
  revalidatePath("/productos");
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
  // Cobrar un fiado mueve el estado de una cuenta por cobrar (dinero): queda en la bitácora,
  // igual que anular un cierre o eliminar una venta.
  await auditar({ accion: "cobrar", entidad: "venta", entidadId: id, detalle: conMonto(`Cobro de fiado (venta #${id})`, venta.totalCents) });
  revalidatePath("/clientes");
  revalidatePath("/ventas");
  revalidatePath("/");
}

export async function eliminarVenta(formData: FormData) {
  await exigirRol("dueno", "cajero");
  const id = Number(formData.get("id"));
  const venta = await db.venta.findUnique({ where: { id }, include: { items: true } });
  if (!venta || venta.cierreId) return; // no borrar ventas ya cerradas en caja
  await db.$transaction(async (tx) => {
    // Devolver al stock lo que la venta había descontado.
    for (const it of venta.items) {
      if (it.productoId) await ajustarStockProducto(tx, it.productoId, it.cantidad);
    }
    await tx.venta.delete({ where: { id } });
  });
  await auditar({ accion: "eliminar", entidad: "venta", entidadId: id, detalle: conMonto(`Venta #${id}`, venta.totalCents) });
  revalidatePath("/ventas");
  revalidatePath("/caja");
  revalidatePath("/productos");
  revalidatePath("/");
}
