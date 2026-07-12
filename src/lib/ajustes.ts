import { db } from "@/lib/db";

/** Lee un ajuste numérico (en centavos u otro entero). */
export async function getAjusteNumero(clave: string, def = 0): Promise<number> {
  const a = await db.ajuste.findUnique({ where: { clave } });
  return a ? Number(a.valor) : def;
}

/** Lee un ajuste de texto (o null si no existe). */
export async function getAjuste(clave: string): Promise<string | null> {
  const a = await db.ajuste.findUnique({ where: { clave } });
  return a?.valor ?? null;
}

/** Guarda (crea o actualiza) un ajuste. */
export async function setAjuste(clave: string, valor: string): Promise<void> {
  await db.ajuste.upsert({
    where: { clave },
    create: { clave, valor },
    update: { valor },
  });
}
