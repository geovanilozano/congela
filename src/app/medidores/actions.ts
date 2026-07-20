"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { fechaLocalODefecto, fechaLocal } from "@/lib/fechas";
import { guardarFoto } from "@/lib/upload";
import { exigirDueno } from "@/lib/auth/guard";
import { auditar, conMonto } from "@/lib/auditoria";
import { liquidarMedidor } from "@/lib/finance/medidor";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** Liga el medidor a un cliente por nombre (usa el existente o crea uno mínimo). */
async function resolverClienteId(nombre: string): Promise<number | null> {
  const limpio = nombre.trim();
  if (!limpio) return null;
  const existente = await db.cliente.findFirst({ where: { nombre: { equals: limpio, mode: "insensitive" } } });
  return existente ? existente.id : (await db.cliente.create({ data: { nombre: limpio } })).id;
}

// Número o null si el campo viene vacío o no es un número válido.
function numeroOpcional(v: FormDataEntryValue | null): number | null {
  if (v === null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// ---- Medidores -----------------------------------------------------------

export async function crearMedidor(formData: FormData) {
  await exigirDueno();
  const numero = String(formData.get("numero") || "").trim();
  if (!numero) redirect("/medidores?error=numero");
  const clienteId = await resolverClienteId(String(formData.get("clienteNombre") || ""));
  await db.medidorCliente.create({
    data: {
      numero,
      clienteId,
      marca: String(formData.get("marca") || "").trim() || null,
      direccion: String(formData.get("direccion") || "").trim() || null,
      factor: Math.max(1, Math.round(Number(formData.get("factor")) || 1)),
      nota: String(formData.get("nota") || "").trim() || null,
    },
  });
  revalidatePath("/medidores");
  redirect("/medidores?ok=1");
}

export async function actualizarMedidor(formData: FormData) {
  await exigirDueno();
  const id = Number(formData.get("id"));
  if (!id) return;
  const numero = String(formData.get("numero") || "").trim();
  if (!numero) redirect(`/medidores?editar=${id}&error=numero`);
  const clienteId = await resolverClienteId(String(formData.get("clienteNombre") || ""));
  await db.medidorCliente.update({
    where: { id },
    data: {
      numero,
      clienteId,
      marca: String(formData.get("marca") || "").trim() || null,
      direccion: String(formData.get("direccion") || "").trim() || null,
      factor: Math.max(1, Math.round(Number(formData.get("factor")) || 1)),
      nota: String(formData.get("nota") || "").trim() || null,
    },
  });
  revalidatePath("/medidores");
  redirect("/medidores?ok=1");
}

export async function eliminarMedidor(formData: FormData) {
  await exigirDueno();
  const id = Number(formData.get("id"));
  if (!id) return;
  const m = await db.medidorCliente.findUnique({ where: { id }, select: { numero: true } });
  await db.medidorCliente.delete({ where: { id } }); // cascada: sus liquidaciones
  await auditar({ accion: "eliminar", entidad: "medidor", entidadId: id, detalle: `Medidor «${m?.numero ?? id}» (con sus liquidaciones)` });
  revalidatePath("/medidores");
}

// ---- Liquidaciones -------------------------------------------------------

export async function crearLiquidacion(formData: FormData) {
  await exigirDueno();
  const medidorId = Number(formData.get("medidorId"));
  if (!medidorId) return;

  const medidor = await db.medidorCliente.findUnique({ where: { id: medidorId }, select: { factor: true } });
  if (!medidor) return;

  const lecturaAnterior = Math.round(Number(formData.get("lecturaAnterior")) || 0);
  const lecturaActual = Math.round(Number(formData.get("lecturaActual")) || 0);
  const tarifaCuCents = toCents(Number(formData.get("tarifaPesos")) || 0);
  if (tarifaCuCents <= 0) redirect(`/medidores/${medidorId}?error=tarifa`);

  const fotoUrl = await guardarFoto(formData.get("foto"));

  const alumbradoTotalCents = toCents(Number(formData.get("alumbradoTotalPesos")) || 0);
  const aseoTotalCents = toCents(Number(formData.get("aseoTotalPesos")) || 0);

  await db.liquidacionMedidor.create({
    data: {
      medidorId,
      fechaAnterior: fechaLocal(String(formData.get("fechaAnterior") ?? "")) ?? fechaLocalODefecto(null),
      fechaActual: fechaLocalODefecto(formData.get("fechaActual")),
      lecturaAnterior,
      lecturaActual,
      factor: medidor.factor,
      fotoUrl,
      tarifaCuCents,
      subsidioCents: toCents(Number(formData.get("subsidioPesos")) || 0),
      alumbradoTotalCents,
      alumbradoPct: numeroOpcional(formData.get("alumbradoPct")) ?? 0,
      aseoTotalCents,
      aseoPct: numeroOpcional(formData.get("aseoPct")) ?? 0,
    },
  });

  revalidatePath(`/medidores/${medidorId}`);
  redirect(`/medidores/${medidorId}?ok=1`);
}

export async function eliminarLiquidacion(formData: FormData) {
  await exigirDueno();
  const id = Number(formData.get("id"));
  if (!id) return;
  const liq = await db.liquidacionMedidor.findUnique({ where: { id }, select: { medidorId: true } });
  await db.liquidacionMedidor.delete({ where: { id } });
  await auditar({ accion: "eliminar", entidad: "liquidacion", entidadId: id, detalle: "Liquidación de medidor" });
  if (liq) revalidatePath(`/medidores/${liq.medidorId}`);
}

// Marca una liquidación como pagada (o la reabre). Registra el monto en la bitácora.
export async function alternarPagadaLiquidacion(formData: FormData) {
  await exigirDueno();
  const id = Number(formData.get("id"));
  if (!id) return;
  const liq = await db.liquidacionMedidor.findUnique({ where: { id } });
  if (!liq) return;

  const pagada = !liq.pagada;
  await db.liquidacionMedidor.update({
    where: { id },
    data: { pagada, pagadaEn: pagada ? new Date() : null },
  });

  if (pagada) {
    const r = liquidarMedidor(liq);
    await auditar({ accion: "actualizar", entidad: "liquidacion", entidadId: id, detalle: conMonto("Cobro de medidor pagado", r.totalCents) });
  }
  revalidatePath(`/medidores/${liq.medidorId}`);
}
