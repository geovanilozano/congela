// Cifrado de secretos guardados en la base de datos (clave de Growatt, API key de OCR).
//
// Sin esto, esos secretos quedaban en texto plano en la base y —peor— se copiaban tal
// cual en el respaldo (JSON). Aquí se cifran con AES-256-GCM usando una clave derivada
// de AUTH_SECRET, que en producción es obligatoria y secreta.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const MARCA = "enc.v1."; // prefijo que identifica un valor cifrado por este módulo
const SAL = "congela.secretos.v1"; // sal fija para derivar la clave (no es secreta)

function clave(): Buffer {
  const secreto = process.env.AUTH_SECRET || "congela-secreto-local-cambialo";
  return scryptSync(secreto, SAL, 32); // 32 bytes = AES-256
}

/** Cifra un texto. El resultado empieza por la marca y es seguro de guardar. */
export function cifrar(texto: string): string {
  const iv = randomBytes(12); // GCM recomienda 12 bytes
  const cipher = createCipheriv("aes-256-gcm", clave(), iv);
  const datos = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return MARCA + Buffer.concat([iv, tag, datos]).toString("base64url");
}

/**
 * Descifra un valor. Si el texto no tiene la marca, se asume que es texto plano
 * antiguo (de antes del cifrado) y se devuelve tal cual: así la migración es
 * transparente. Lanza si un valor cifrado fue manipulado o la clave no coincide.
 */
export function descifrar(valor: string): string {
  if (!valor.startsWith(MARCA)) return valor;

  const bruto = Buffer.from(valor.slice(MARCA.length), "base64url");
  const iv = bruto.subarray(0, 12);
  const tag = bruto.subarray(12, 28);
  const datos = bruto.subarray(28);

  const decipher = createDecipheriv("aes-256-gcm", clave(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(datos), decipher.final()]).toString("utf8");
}
