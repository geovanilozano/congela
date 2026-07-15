import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION } from "@/lib/auth/token";
import { sesionValida } from "@/lib/auth/dal";
import { puedeAcceder } from "@/lib/auth/permisos";

// Se ejecuta antes de renderizar cada ruta: exige sesión y respeta los permisos por rol.
// La sesión se valida contra la base de datos, así un usuario desactivado queda fuera
// de inmediato aunque su cookie siga siendo válida.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sesion = await sesionValida(req.cookies.get(COOKIE_SESION)?.value);

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
