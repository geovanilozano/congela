import { leerGasto } from "@/lib/ocr";
import { getSesion } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Leer con IA cuesta dinero (API de Claude): exige sesión.
  if (!(await getSesion())) {
    return Response.json({ ok: false, error: "Necesitas iniciar sesión." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("foto");
  if (!file || typeof file === "string") {
    return Response.json({ ok: false, error: "No se recibió ninguna imagen." }, { status: 400 });
  }

  const f = file as File;
  // Tope de tamaño: leer con IA cuesta por imagen, y una foto de recibo cabe de sobra en
  // 8 MB. Se rechaza antes de convertir a base64 y llamar a la API.
  if (f.size > 8 * 1024 * 1024) {
    return Response.json({ ok: false, error: "La imagen es demasiado grande (máx. 8 MB)." }, { status: 413 });
  }
  const base64 = Buffer.from(await f.arrayBuffer()).toString("base64");
  const resultado = await leerGasto(base64, f.type || "image/jpeg");

  return Response.json(resultado, { status: resultado.ok ? 200 : 400 });
}
