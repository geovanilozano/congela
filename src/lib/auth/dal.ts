// Verificación REAL de la sesión, contra la base de datos.
//
// El token firmado solo prueba que la cookie no fue alterada. No sabe si el usuario
// sigue existiendo, si lo desactivaste o si le cambiaste el rol. Esa es la fuente de
// verdad, y está en la base de datos: por eso cada petición la consulta aquí.
//
// (Next.js recomienda justo esto: el proxy hace el chequeo rápido y la autorización
// de verdad se resuelve contra los datos.)
import { db } from "@/lib/db";
import { verificar, type Sesion } from "./token";

/**
 * Devuelve la sesión solo si el token es válido Y el usuario sigue habilitado.
 * El rol y el nombre que devuelve son los de la base de datos (no los del token),
 * así un cambio de rol tiene efecto de inmediato.
 */
export async function sesionValida(token: string | undefined | null): Promise<Sesion | null> {
  const firmada = await verificar(token);
  if (!firmada) return null;

  const usuario = await db.usuario.findUnique({
    where: { id: firmada.userId },
    select: { id: true, nombre: true, rol: true, activo: true },
  });

  // Usuario borrado o desactivado -> la sesión deja de servir al instante.
  if (!usuario || !usuario.activo) return null;

  return { userId: usuario.id, rol: usuario.rol, nombre: usuario.nombre };
}
