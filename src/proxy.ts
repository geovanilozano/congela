import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, verificar } from "@/lib/auth/token";
import { puedeAcceder } from "@/lib/auth/permisos";

// Se ejecuta antes de renderizar cada ruta: exige sesión y respeta los permisos por rol.
//
// Chequeo OPTIMISTA: valida solo la firma del token (sin tocar la base de datos), para
// que el middleware sea instantáneo en cada navegación. La autorización real —y el
// bloqueo inmediato de un usuario desactivado— vive en los server actions, que sí
// consultan la base de datos vía exigirRol/exigirDueno (ver src/lib/auth/guard.ts).
// Es justo el patrón que recomienda la documentación de Next.js.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sesion = await verificar(req.cookies.get(COOKIE_SESION)?.value);

  // Sin sesión -> al login.
  if (!sesion) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Con sesión, pero sin permiso para esta ruta -> al tablero.
  if (!puedeAcceder(sesion.rol, pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Se aplica a todo menos: /login, /api/keepalive (ping del cron, sin sesión),
// archivos internos de Next, /uploads, favicon y archivos con extensión.
export const config = {
  matcher: ["/((?!login|api/keepalive|_next|uploads|favicon.ico|.*\\.).*)"],
};
