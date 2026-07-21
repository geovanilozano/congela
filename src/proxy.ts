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

  // Se pasa la ruta al layout (vía cabecera) para que allí se re-autorice contra la BD
  // (rol/estado VIVOS). Así la LECTURA de páginas también respeta una desactivación o un
  // cambio de rol al instante, no solo la escritura. Las rutas públicas (login) no pasan
  // por aquí, así que el layout no verá la cabecera y no exigirá sesión.
  const headers = new Headers(req.headers);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
}

// Se aplica a todo menos: /login, /offline (pantalla sin conexión del PWA, pública para
// que el service worker la cachee sin sesión), /api/keepalive (ping del cron), archivos
// internos de Next, /uploads, favicon, los íconos e ícono de iOS (públicos, los usa el
// manifiesto PWA) y archivos con extensión (incluye /sw.js).
export const config = {
  matcher: ["/((?!login|offline|api/keepalive|api/cron|_next|uploads|favicon.ico|icon|apple-icon|manifest.webmanifest|.*\\.).*)"],
};
