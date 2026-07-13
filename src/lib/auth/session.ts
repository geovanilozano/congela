// Manejo de la cookie de sesión (solo en servidor: usa next/headers).
import { cookies } from "next/headers";
import { cache } from "react";
import { firmar, COOKIE_SESION, DURACION_SESION_SEG, type Sesion } from "./token";
import { sesionValida } from "./dal";

export async function crearSesion(sesion: Sesion) {
  const token = await firmar(sesion);
  const store = await cookies();
  store.set(COOKIE_SESION, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production", // por HTTPS cuando esté publicada
    path: "/",
    maxAge: DURACION_SESION_SEG,
  });
}

/**
 * La sesión de quien está usando la app, verificada contra la base de datos.
 * `cache` hace que, aunque varias partes de la página la pidan, solo se consulte una
 * vez por petición.
 */
export const getSesion = cache(async (): Promise<Sesion | null> => {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  return sesionValida(token);
});

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE_SESION);
}

export type { Sesion };
