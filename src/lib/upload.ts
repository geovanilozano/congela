// Guarda un archivo subido (foto de recibo/factura) en public/uploads y
// devuelve su URL pública (/uploads/xxx). Devuelve null si no hay archivo.
import { writeFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function guardarFoto(file: FormDataEntryValue | null): Promise<string | null> {
  if (!file || typeof file === "string") return null;
  const f = file as File;
  if (!f.size) return null;

  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(f.name) || ".jpg";
  const nombre = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await f.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, nombre), buffer);
  return `/uploads/${nombre}`;
}
