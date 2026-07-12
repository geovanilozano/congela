import { NextResponse, type NextRequest } from "next/server";
import { verificar, COOKIE_SESION } from "@/lib/auth/token";
import { puedeAcceder } from "@/lib/auth/permisos";

// Se ejecuta antes de renderizar cada ruta: exige sesión y respeta los permisos por rol.
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

// Se aplica a todo menos: /login, archivos internos de Next, /uploads, favicon y archivos con extensión.
export const config = {
  matcher: ["/((?!login|_next|uploads|favicon.ico|.*\\.).*)"],
};
