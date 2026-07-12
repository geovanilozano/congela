// Lee los datos de un recibo/factura a partir de la foto, usando la visión de Claude.
// La clave de API se configura en Ajustes (o en la variable de entorno ANTHROPIC_API_KEY).
import Anthropic from "@anthropic-ai/sdk";
import { getAjuste } from "@/lib/ajustes";

export interface DatosRecibo {
  tipo: string | null;
  valorPesos: number | null;
  consumo: number | null;
  fecha: string | null;
}

const TIPOS_VALIDOS = ["energia", "agua", "gas", "internet"];

export async function leerRecibo(base64: string, mediaType: string): Promise<
  { ok: true; datos: DatosRecibo } | { ok: false; error: string }
> {
  const apiKey = (await getAjuste("anthropicApiKey")) || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Falta configurar la clave de API en Ajustes." };
  }

  const modelo = (await getAjuste("ocrModelo")) || "claude-opus-4-8";
  const media = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mediaType)
    ? (mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp")
    : "image/jpeg";

  const client = new Anthropic({ apiKey });

  try {
    const respuesta = await client.messages.create({
      model: modelo,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: media, data: base64 } },
            {
              type: "text",
              text: [
                "Este es un recibo de un servicio público. Extrae sus datos.",
                "Responde ÚNICAMENTE con un objeto JSON válido, sin ningún texto adicional, con estas claves:",
                '- "tipo": uno de "energia", "agua", "gas" o "internet" (según el servicio).',
                '- "valorPesos": el valor total a pagar, como número entero en pesos, sin puntos ni símbolos.',
                '- "consumo": el consumo (kWh, m3, etc.) como número, o null si no aparece.',
                '- "fecha": la fecha del recibo en formato "YYYY-MM-DD", o null si no aparece.',
                'Si algún dato no está claro, usa null. Ejemplo: {"tipo":"energia","valorPesos":85000,"consumo":210,"fecha":"2026-07-01"}',
              ].join("\n"),
            },
          ],
        },
      ],
    });

    const texto = respuesta.content.find((b) => b.type === "text");
    const raw = texto && "text" in texto ? texto.text : "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { ok: false, error: "No se pudo leer la factura." };

    const json = JSON.parse(match[0]);
    const datos: DatosRecibo = {
      tipo: TIPOS_VALIDOS.includes(json.tipo) ? json.tipo : null,
      valorPesos: typeof json.valorPesos === "number" ? Math.round(json.valorPesos) : null,
      consumo: typeof json.consumo === "number" ? json.consumo : null,
      fecha: typeof json.fecha === "string" ? json.fecha : null,
    };
    return { ok: true, datos };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al leer la factura.";
    return { ok: false, error: msg };
  }
}
