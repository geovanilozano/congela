import { leerRecibo } from "@/lib/ocr";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("foto");
  if (!file || typeof file === "string") {
    return Response.json({ ok: false, error: "No se recibió ninguna imagen." }, { status: 400 });
  }

  const f = file as File;
  const base64 = Buffer.from(await f.arrayBuffer()).toString("base64");
  const resultado = await leerRecibo(base64, f.type || "image/jpeg");

  return Response.json(resultado, { status: resultado.ok ? 200 : 400 });
}
