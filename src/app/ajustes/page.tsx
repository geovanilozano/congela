import { BotonEliminar } from "@/components/BotonEliminar";
import { borrarDatosDemo } from "./actions";

export const dynamic = "force-dynamic";

export default function AjustesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">⚙️ Ajustes</h1>
        <p className="mt-1 text-sm text-slate-500">Copia de seguridad y limpieza de datos.</p>
      </div>

      {/* Respaldo */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-700">Copia de seguridad</h2>
        <p className="mt-1 text-sm text-slate-500">
          Descarga toda la información del sistema en un archivo (JSON) para guardarla como respaldo.
        </p>
        <a
          href="/api/export?tipo=respaldo"
          className="mt-3 inline-block rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          ⬇️ Descargar respaldo
        </a>
      </div>

      {/* Limpieza */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
        <h2 className="font-semibold text-red-700">Borrar datos de demostración</h2>
        <p className="mt-1 text-sm text-red-600">
          Elimina <b>todas</b> las ventas, gastos, créditos, inversión, activos, producción,
          inventario, personal, energía y demás registros para empezar desde cero. Los fondos
          (arriendo, crédito, reserva…) se conservan. <b>Esta acción no se puede deshacer.</b>
        </p>
        <div className="mt-3">
          <BotonEliminar
            action={borrarDatosDemo}
            mensaje="Vas a borrar TODOS los datos para empezar limpio. ¿Continuar? Esta acción no se puede deshacer."
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Borrar todo y empezar limpio
          </BotonEliminar>
        </div>
      </div>
    </div>
  );
}
