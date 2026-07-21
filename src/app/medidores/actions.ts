"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { fechaLocalODefecto, fechaLocal } from "@/lib/fechas";
import { guardarFoto } from "@/lib/upload";
import { exigirRol } from "@/lib/auth/guard";
import { auditar, conMonto } from "@/lib/auditoria";
import { liquidarMedidor } from "@/lib/finance/medidor";
import { numeroOpcional } from "@/lib/forms";
import { resolverClienteId } from "@/lib/clientes-db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ---- Medidores -----------------------------------------------------------

export async function crearMedidor(formData: FormData) {
  await exigirRol("dueno", "medidores");
  const numero = String(formData.get("numero") || "").trim();
  if (!numero) redirect("/medidores?error=numero");
  // El número identifica físicamente el medidor: no permitir duplicados (mezclarían las
  // liquidaciones de dos medidores distintos).
  const dup = await db.medidorCliente.findFirst({ where: { numero } });
  if (dup) redirect("/medidores?error=duplicado");
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
  await exigirRol("dueno", "medidores");
  const id = Number(formData.get("id"));
  if (!id) return;
  const numero = String(formData.get("numero") || "").trim();
  if (!numero) redirect(`/medidores?editar=${id}&error=numero`);
  // No chocar con OTRO medidor que ya tenga ese número.
  const dup = await db.medidorCliente.findFirst({ where: { numero, id: { not: id } } });
  if (dup) redirect(`/medidores?editar=${id}&error=duplicado`);
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
  await exigirRol("dueno", "medidores");
  const id = Number(formData.get("id"));
  if (!id) return;
  const m = await db.medidorCliente.findUnique({ where: { id }, select: { numero: true } });
  await db.medidorCliente.delete({ where: { id } }); // cascada: sus liquidaciones
  await auditar({ accion: "eliminar", entidad: "medidor", entidadId: id, detalle: `Medidor «${m?.numero ?? id}» (con sus liquidaciones)` });
  revalidatePath("/medidores");
}

// ---- Liquidaciones -------------------------------------------------------

export async function crearLiquidacion(formData: FormData) {
  await exigirRol("dueno", "medidores");
  const medidorId = Number(formData.get("medidorId"));
  if (!medidorId) return;

  const medidor = await db.medidorCliente.findUnique({ where: { id: medidorId }, select: { factor: true } });
  if (!medidor) return;

  // Las lecturas pueden traer decimales (el medidor las marca); el consumo se redondea
  // a kWh enteros dentro del calculador, no aquí.
  const lecturaAnterior = Number(formData.get("lecturaAnterior")) || 0;
  const lecturaActual = Number(formData.get("lecturaActual")) || 0;
  const tarifaCuCents = toCents(Number(formData.get("tarifaPesos")) || 0);
  if (tarifaCuCents <= 0) redirect(`/medidores/${medidorId}?error=tarifa`);

  const fotoUrl = await guardarFoto(formData.get("foto"));

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
      subsidioPct: numeroOpcional(formData.get("subsidioPct")) ?? 0,
      subsistenciaKwh: Math.max(0, Math.round(Number(formData.get("subsistenciaKwh")) || 173)),
      consumoTotalKwh: Math.max(0, Math.round(Number(formData.get("consumoTotalKwh")) || 0)),
      alumbradoTotalCents: toCents(Number(formData.get("alumbradoTotalPesos")) || 0),
      alumbradoPct: numeroOpcional(formData.get("alumbradoPct")) ?? 50,
      aseoTotalCents: toCents(Number(formData.get("aseoTotalPesos")) || 0),
      aseoPct: numeroOpcional(formData.get("aseoPct")) ?? 0,
    },
  });

  revalidatePath(`/medidores/${medidorId}`);
  redirect(`/medidores/${medidorId}?ok=1`);
}

export async function eliminarLiquidacion(formData: FormData) {
  await exigirRol("dueno", "medidores");
  const id = Number(formData.get("id"));
  if (!id) return;
  const liq = await db.liquidacionMedidor.findUnique({ where: { id }, select: { medidorId: true } });
  await db.liquidacionMedidor.delete({ where: { id } });
  await auditar({ accion: "eliminar", entidad: "liquidacion", entidadId: id, detalle: "Liquidación de medidor" });
  if (liq) revalidatePath(`/medidores/${liq.medidorId}`);
}

// Marca una liquidación como pagada (o la reabre). Registra el monto en la bitácora.
export async function alternarPagadaLiquidacion(formData: FormData) {
  await exigirRol("dueno", "medidores");
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
