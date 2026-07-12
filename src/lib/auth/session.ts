// Manejo de la cookie de sesión (solo en servidor: usa next/headers).
import { cookies } from "next/headers";
import { firmar, verificar, COOKIE_SESION, type Sesion } from "./token";

export async function crearSesion(sesion: Sesion) {
  const token = await firmar(sesion);
  const store = await cookies();
  store.set(COOKIE_SESION, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });
}

export async function getSesion(): Promise<Sesion | null> {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  return verificar(token);
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE_SESION);
}

export type { Sesion };
