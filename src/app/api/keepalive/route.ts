import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Ping ligero para evitar que la base de datos Neon (plan gratis) se "duerma"
// por inactividad. Un cron la llama cada pocos minutos, así el primer clic del
// usuario no tiene que esperar el arranque en frío de la base de datos.
// Está excluida del proxy de sesión (ver src/proxy.ts) para que el cron pueda
// alcanzarla sin cookie.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
