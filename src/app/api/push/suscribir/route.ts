import { db } from "@/lib/db";
import { getSesion } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Guarda (o actualiza) la suscripción push de un dispositivo. Exige sesión.
export async function POST(request: Request) {
  if (!(await getSesion())) {
    return Response.json({ ok: false, error: "Necesitas iniciar sesión." }, { status: 401 });
  }

  const sub = (await request.json().catch(() => null)) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  } | null;

  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return Response.json({ ok: false, error: "Suscripción inválida." }, { status: 400 });
  }

  await db.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh, auth },
    create: { endpoint, p256dh, auth },
  });

  return Response.json({ ok: true });
}
