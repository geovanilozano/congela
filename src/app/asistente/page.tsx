import { AsistenteChat } from "@/components/AsistenteChat";

export const dynamic = "force-dynamic";

export default function AsistentePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🤖 Asistente</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pregúntale a la IA sobre tu negocio en español: ventas, quién te debe, resumen del mes,
          inventario… Responde con tus datos actuales. Cada pregunta usa tu clave de Claude (la misma
          del OCR), así que tiene un pequeño costo por consulta.
        </p>
      </div>

      <AsistenteChat />
    </div>
  );
}
