// Guarda la foto de un recibo/factura y devuelve la URL con que se muestra.
//
// En producción (Vercel) se guarda en Vercel Blob (almacenamiento en la nube), porque el
// disco del servidor no es permanente. En desarrollo local, si no hay token de Blob, se
// guarda en una carpeta privada `archivos/` y se sirve por `/api/archivo` (exige sesión).
import { writeFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { put } from "@vercel/blob";

/** Carpeta privada (fuera de `public/`) donde viven las fotos en desarrollo local. */
export const CARPETA_ARCHIVOS = path.join(process.cwd(), "archivos");

/** Solo estas extensiones: son fotos de recibos, no ejecutables. */
const EXTENSIONES = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".pdf"]);

export async function guardarFoto(file: FormDataEntryValue | null): Promise<string | null> {
  if (!file || typeof file === "string") return null;
  const f = file as File;
  if (!f.size) return null;

  const ext = path.extname(f.name).toLowerCase();
  const extSegura = EXTENSIONES.has(ext) ? ext : ".jpg";
  const nombre = `${randomUUID()}${extSegura}`;
  const buffer = Buffer.from(await f.arrayBuffer());

  // Producción: Vercel Blob.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`recibos/${nombre}`, buffer, {
      access: "public",
      contentType: f.type || undefined,
    });
    return blob.url;
  }

  // Desarrollo local: carpeta privada servida por /api/archivo.
  await mkdir(CARPETA_ARCHIVOS, { recursive: true });
  await writeFile(path.join(CARPETA_ARCHIVOS, nombre), buffer);
  return `/api/archivo?f=${nombre}`;
}
