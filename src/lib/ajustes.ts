import { db } from "@/lib/db";
import { cifrar, descifrar } from "@/lib/crypto";

/**
 * Ajustes que guardan secretos: se cifran en la base y NUNCA se incluyen en el respaldo.
 * (El usuario de Growatt no es secreto, sí lo es su clave.)
 */
export const CLAVES_SECRETAS = ["growattClave", "anthropicApiKey"] as const;

/** Lee un ajuste numérico (en centavos u otro entero). */
export async function getAjusteNumero(clave: string, def = 0): Promise<number> {
  const a = await db.ajuste.findUnique({ where: { clave } });
  return a ? Number(a.valor) : def;
}

/** Guarda un secreto cifrado. Úsalo para claves y tokens, no para valores normales. */
export async function setAjusteSeguro(clave: string, valor: string): Promise<void> {
  await setAjuste(clave, cifrar(valor));
}

/**
 * Lee un secreto y lo descifra. Si la clave cambió o el valor está dañado, devuelve
 * null en vez de romper la app (el módulo aparecerá como "no conectado").
 */
export async function getAjusteSeguro(clave: string): Promise<string | null> {
  const guardado = await getAjuste(clave);
  if (!guardado) return null;
  try {
    return descifrar(guardado);
  } catch {
    return null;
  }
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
