import { enviarAtodos } from "@/lib/push";
import { resumenParaNotificar } from "@/lib/alertas";

export const dynamic = "force-dynamic";

// Envía la notificación push con los pendientes del día a todos los dispositivos suscritos.
// Lo dispara un cron externo (cron-job.org) una o dos veces al día, protegido con CRON_SECRET.
// No exige sesión (el proxy lo deja pasar), pero SIN el token correcto responde 401.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return new Response("No autorizado", { status: 401 });
  }

  const resumen = await resumenParaNotificar();
  if (!resumen.hay) {
    return Response.json({ ok: true, enviados: 0, motivo: "sin pendientes hoy" });
  }

  const r = await enviarAtodos({ title: resumen.titulo, body: resumen.cuerpo, url: "/" });
  return Response.json({ ok: true, ...r });
}
