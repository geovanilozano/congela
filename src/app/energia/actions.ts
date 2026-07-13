"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { setAjuste, getAjuste, setAjusteSeguro, getAjusteSeguro } from "@/lib/ajustes";
import { sincronizarGrowatt } from "@/lib/growatt";
import { revalidatePath } from "next/cache";
import { fechaLocalODefecto } from "@/lib/fechas";

export async function guardarCredencialesGrowatt(formData: FormData) {
  const usuario = String(formData.get("growattUsuario") || "").trim();
  const clave = String(formData.get("growattClave") || "");
  if (usuario) await setAjuste("growattUsuario", usuario);
  if (clave) await setAjusteSeguro("growattClave", clave);
  revalidatePath("/energia");
}

export async function sincronizarGrowattAccion() {
  const usuario = (await getAjuste("growattUsuario")) || "";
  const clave = (await getAjusteSeguro("growattClave")) || "";
  const r = await sincronizarGrowatt(usuario, clave);

  if (r.ok) {
    // Guardar/actualizar la generación de hoy marcada como "api".
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const yaHoy = await db.energiaGeneracion.findFirst({
      where: { fuente: "api", fecha: { gte: inicio } },
    });
    if (yaHoy) {
      await db.energiaGeneracion.update({ where: { id: yaHoy.id }, data: { kwh: r.kwhHoy } });
    } else {
      await db.energiaGeneracion.create({ data: { kwh: r.kwhHoy, fuente: "api" } });
    }
    await setAjuste("growattMsg", `✅ Sincronizado: ${r.kwhHoy} kWh generados hoy.`);
  } else {
    await setAjuste("growattMsg", `⚠️ ${r.error}`);
  }

  revalidatePath("/energia");
  revalidatePath("/");
}

export async function guardarPrecioKwh(formData: FormData) {
  const precioPesos = Number(formData.get("precioPesos")) || 0;
  await setAjuste("precioKwhCents", String(toCents(precioPesos)));
  revalidatePath("/energia");
  revalidatePath("/");
}

export async function registrarGeneracion(formData: FormData) {
  const kwh = Number(formData.get("kwh")) || 0;
  const fecha = fechaLocalODefecto(formData.get("fecha"));
  if (kwh <= 0) return;
  await db.energiaGeneracion.create({ data: { kwh, fecha } });
  revalidatePath("/energia");
  revalidatePath("/");
}

export async function registrarConsumo(formData: FormData) {
  const kwh = Number(formData.get("kwh")) || 0;
  const fecha = fechaLocalODefecto(formData.get("fecha"));
  if (kwh <= 0) return;
  await db.medidorLectura.create({ data: { kwh, fecha } });
  revalidatePath("/energia");
  revalidatePath("/");
}
