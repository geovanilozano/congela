"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { setAjuste } from "@/lib/ajustes";
import { revalidatePath } from "next/cache";

export async function guardarPrecioKwh(formData: FormData) {
  const precioPesos = Number(formData.get("precioPesos")) || 0;
  await setAjuste("precioKwhCents", String(toCents(precioPesos)));
  revalidatePath("/energia");
  revalidatePath("/");
}

export async function registrarGeneracion(formData: FormData) {
  const kwh = Number(formData.get("kwh")) || 0;
  const fecha = formData.get("fecha") ? new Date(String(formData.get("fecha"))) : new Date();
  if (kwh <= 0) return;
  await db.energiaGeneracion.create({ data: { kwh, fecha } });
  revalidatePath("/energia");
  revalidatePath("/");
}

export async function registrarConsumo(formData: FormData) {
  const kwh = Number(formData.get("kwh")) || 0;
  const fecha = formData.get("fecha") ? new Date(String(formData.get("fecha"))) : new Date();
  if (kwh <= 0) return;
  await db.medidorLectura.create({ data: { kwh, fecha } });
  revalidatePath("/energia");
  revalidatePath("/");
}
