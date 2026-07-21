// Envío de notificaciones push (Web Push / VAPID). Requiere las variables de entorno
// VAPID (públicas/privadas). Si no están, todo degrada a "no disponible" sin romper nada.
import webpush from "web-push";
import { db } from "@/lib/db";

export function pushDisponible(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configurar() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:congela@congela.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  );
}

export interface Aviso {
  title: string;
  body: string;
  url?: string;
}

/** Envía un aviso a TODOS los dispositivos suscritos. Borra las suscripciones muertas (404/410). */
export async function enviarAtodos(aviso: Aviso): Promise<{ enviados: number; borrados: number; total: number }> {
  if (!pushDisponible()) return { enviados: 0, borrados: 0, total: 0 };
  configurar();

  const subs = await db.pushSubscription.findMany();
  const payload = JSON.stringify(aviso);
  let enviados = 0;
  let borrados = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
        enviados++;
      } catch (e: unknown) {
        const code = (e as { statusCode?: number }).statusCode;
        // Suscripción caducada o revocada: se borra para no reintentar en vano.
        if (code === 404 || code === 410) {
          await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          borrados++;
        }
      }
    }),
  );

  return { enviados, borrados, total: subs.length };
}
