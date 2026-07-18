"use server";

import { exigirDueno } from "@/lib/auth/guard";
import { resumenNegocio } from "@/lib/resumen-negocio";
import { responderPregunta } from "@/lib/asistente";

export type RespuestaAsistente = { ok: true; respuesta: string } | { ok: false; error: string };

// Responde una pregunta del dueño sobre el negocio. Solo el dueño (datos financieros).
export async function preguntar(pregunta: string): Promise<RespuestaAsistente> {
  await exigirDueno();
  const q = String(pregunta || "").trim();
  if (!q) return { ok: false, error: "Escribe una pregunta." };

  const resumen = await resumenNegocio();
  return responderPregunta(resumen, q);
}
