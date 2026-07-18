// Asistente de negocio con IA: responde preguntas del dueño usando SOLO el resumen del
// negocio como contexto (no consulta la base de datos ni ejecuta acciones). La clave de
// API es la misma del OCR (se configura en Ajustes o por variable de entorno).
import Anthropic from "@anthropic-ai/sdk";
import { getAjuste, getAjusteSeguro } from "@/lib/ajustes";

export async function responderPregunta(
  resumen: string,
  pregunta: string,
): Promise<{ ok: true; respuesta: string } | { ok: false; error: string }> {
  const apiKey = (await getAjusteSeguro("anthropicApiKey")) || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Falta configurar la clave de API de Claude en Ajustes." };
  }

  // Modelo económico por defecto (configurable en Ajustes con la clave "asistenteModelo").
  const modelo = (await getAjuste("asistenteModelo")) || "claude-haiku-4-5-20251001";
  const client = new Anthropic({ apiKey });

  try {
    const respuesta = await client.messages.create({
      model: modelo,
      max_tokens: 600,
      system:
        "Eres el asistente del negocio Congela (producción y venta de hielo en Colombia). " +
        "Responde en español, claro y breve, para el dueño del negocio (no es técnico). " +
        "Usa ÚNICAMENTE los datos del resumen que se te entrega. Si algo no está en el resumen, " +
        "dilo con honestidad (ej. 'con la información disponible no puedo saber eso'). " +
        "Los montos están en pesos colombianos. Nunca inventes cifras.",
      messages: [
        {
          role: "user",
          content: `Datos del negocio:\n\n${resumen}\n\n---\n\nPregunta del dueño: ${pregunta}`,
        },
      ],
    });

    const texto = respuesta.content.find((b) => b.type === "text");
    const raw = texto && "text" in texto ? texto.text.trim() : "";
    if (!raw) return { ok: false, error: "No obtuve respuesta. Intenta de nuevo." };
    return { ok: true, respuesta: raw };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al consultar el asistente.";
    return { ok: false, error: msg };
  }
}
