// Cifrado de contraseñas con scrypt (incluido en Node, sin librerías externas).
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, guardado: string): boolean {
  const [salt, hash] = guardado.split(":");
  if (!salt || !hash) return false;
  const prueba = scryptSync(password, salt, 64);
  const guardadoBuf = Buffer.from(hash, "hex");
  return guardadoBuf.length === prueba.length && timingSafeEqual(guardadoBuf, prueba);
}
