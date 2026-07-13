// Guarda la foto de un recibo/factura y devuelve la URL con que se muestra.
//
// Los archivos NO van a `public/`: ahí quedarían accesibles para cualquiera en internet
// que adivine (o filtre) la dirección, sin necesidad de iniciar sesión. Se guardan en una
// carpeta privada y se sirven por `/api/archivo`, que sí exige sesión.
import { writeFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

/** Carpeta privada (fuera de `public/`) donde viven las fotos subidas. */
export const CARPETA_ARCHIVOS = path.join(process.cwd(), "archivos");

/** Solo estas extensiones: son fotos de recibos, no ejecutables. */
const EXTENSIONES = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".pdf"]);

export async function guardarFoto(file: FormDataEntryValue | null): Promise<string | null> {
  if (!file || typeof file === "string") return null;
  const f = file as File;
  if (!f.size) return null;

  const ext = path.extname(f.name).toLowerCase();
  const extSegura = EXTENSIONES.has(ext) ? ext : ".jpg";

  await mkdir(CARPETA_ARCHIVOS, { recursive: true });
  const nombre = `${randomUUID()}${extSegura}`;
  const buffer = Buffer.from(await f.arrayBuffer());
  await writeFile(path.join(CARPETA_ARCHIVOS, nombre), buffer);

  return `/api/archivo?f=${nombre}`;
}
