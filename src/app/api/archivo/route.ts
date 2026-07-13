// Sirve las fotos de recibos y facturas. Exige sesión: son documentos del negocio,
// no archivos públicos. (El proxy ya bloquea a quien no tenga sesión; aquí se vuelve
// a comprobar, porque una ruta que entrega archivos no debe confiar en nadie más.)
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSesion } from "@/lib/auth/session";
import { CARPETA_ARCHIVOS } from "@/lib/upload";

export const dynamic = "force-dynamic";

const TIPOS: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".pdf": "application/pdf",
};

export async function GET(request: Request) {
  if (!(await getSesion())) {
    return new Response("Necesitas iniciar sesión.", { status: 401 });
  }

  const nombre = new URL(request.url).searchParams.get("f") ?? "";

  // Solo un nombre de archivo simple: nada de "../.." para salirse de la carpeta.
  if (!/^[A-Za-z0-9-]+\.[A-Za-z0-9]+$/.test(nombre)) {
    return new Response("Archivo no válido.", { status: 400 });
  }

  const ruta = path.join(CARPETA_ARCHIVOS, nombre);
  // Cinturón y tirantes: la ruta final tiene que seguir dentro de la carpeta.
  if (path.dirname(path.resolve(ruta)) !== path.resolve(CARPETA_ARCHIVOS)) {
    return new Response("Archivo no válido.", { status: 400 });
  }

  try {
    const datos = await readFile(ruta);
    const tipo = TIPOS[path.extname(nombre).toLowerCase()] ?? "application/octet-stream";
    return new Response(new Uint8Array(datos), {
      headers: {
        "Content-Type": tipo,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("No se encontró el archivo.", { status: 404 });
  }
}
