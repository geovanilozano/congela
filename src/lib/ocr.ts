// Lee los datos de un recibo/factura a partir de la foto, usando la visión de Claude.
// La clave de API se configura en Ajustes (o en la variable de entorno ANTHROPIC_API_KEY).
import Anthropic from "@anthropic-ai/sdk";
import { getAjuste, getAjusteSeguro } from "@/lib/ajustes";

export interface DatosRecibo {
  tipo: string | null;
  valorPesos: number | null;
  consumo: number | null;
  fecha: string | null;
}

const TIPOS_VALIDOS = ["energia", "agua", "gas", "internet"];

// Categorías de gasto que maneja la app (deben coincidir con las del formulario de Gastos).
const CATEGORIAS_GASTO = [
  "bolsas", "mantenimiento", "nomina", "transporte", "arriendo",
  "servicios", "reparaciones", "impuestos", "otro",
];

export interface DatosGasto {
  descripcion: string | null;
  proveedor: string | null;
  valorPesos: number | null;
  fecha: string | null;
  categoria: string | null;
}

/**
 * Lee los datos de una factura o comprobante de GASTO (compra) a partir de la foto.
 * A diferencia de `leerRecibo` (recibos de servicios públicos), aquí extrae los campos
 * de un gasto general del negocio.
 */
export async function leerGasto(base64: string, mediaType: string): Promise<
  { ok: true; datos: DatosGasto } | { ok: false; error: string }
> {
  const apiKey = (await getAjusteSeguro("anthropicApiKey")) || process.env.ANTHROPIC_API_KEY;
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
                "Esta es una factura o comprobante de un gasto de un negocio de hielo. Extrae sus datos.",
                "Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, con estas claves:",
                '- "descripcion": una descripción corta de lo comprado (ej. "Bolsas plásticas", "Repuesto motor").',
                '- "proveedor": el nombre del comercio o proveedor, o null si no aparece.',
                '- "valorPesos": el valor total a pagar, número entero en pesos, sin puntos ni símbolos.',
                '- "fecha": la fecha en formato "YYYY-MM-DD", o null si no aparece.',
                `- "categoria": la que mejor aplique de esta lista: ${CATEGORIAS_GASTO.join(", ")}. Si dudas, usa "otro".`,
                'Si un dato no está claro, usa null (salvo categoria, que usa "otro"). ',
                'Ejemplo: {"descripcion":"Bolsas de hielo","proveedor":"Plásticos ABC","valorPesos":120000,"fecha":"2026-07-15","categoria":"bolsas"}',
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
    const datos: DatosGasto = {
      descripcion: typeof json.descripcion === "string" ? json.descripcion : null,
      proveedor: typeof json.proveedor === "string" ? json.proveedor : null,
      valorPesos: typeof json.valorPesos === "number" ? Math.round(json.valorPesos) : null,
      fecha: typeof json.fecha === "string" ? json.fecha : null,
      categoria: CATEGORIAS_GASTO.includes(json.categoria) ? json.categoria : "otro",
    };
    return { ok: true, datos };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al leer la factura.";
    return { ok: false, error: msg };
  }
}

export async function leerRecibo(base64: string, mediaType: string): Promise<
  { ok: true; datos: DatosRecibo } | { ok: false; error: string }
> {
  const apiKey = (await getAjusteSeguro("anthropicApiKey")) || process.env.ANTHROPIC_API_KEY;
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
