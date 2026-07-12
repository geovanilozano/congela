import { db } from "@/lib/db";
import { BotonEliminar } from "@/components/BotonEliminar";
import { BotonGuardar } from "@/components/BotonGuardar";
import { ROLES } from "@/lib/auth/permisos";
import { borrarDatosDemo, crearUsuario, eliminarUsuario } from "./actions";

export const dynamic = "force-dynamic";

const etiquetaRol: Record<string, string> = { dueno: "Dueño", cajero: "Cajero", operario: "Operario" };

export default async function AjustesPage() {
  const usuarios = await db.usuario.findMany({ orderBy: { id: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">⚙️ Ajustes</h1>
        <p className="mt-1 text-sm text-slate-500">Usuarios, copia de seguridad y limpieza de datos.</p>
      </div>

      {/* Usuarios */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-700">👥 Usuarios y roles</h2>
        <p className="mt-1 text-sm text-slate-500">
          Crea usuarios para tus trabajadores. El <b>Cajero</b> ve ventas, caja y gastos; el
          <b> Operario</b> ve producción, inventario y mantenimiento; el <b>Dueño</b> ve todo.
        </p>

        <form action={crearUsuario} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input name="nombre" required placeholder="Nombre" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <input name="usuario" required placeholder="Usuario (para entrar)" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <input name="clave" required type="text" placeholder="Clave (mín. 4)" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <select name="rol" defaultValue="operario" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            {ROLES.map((r) => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}
          </select>
          <BotonGuardar className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700">
            Crear usuario
          </BotonGuardar>
        </form>

        <div className="mt-4 divide-y divide-slate-100">
          {usuarios.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <span className="font-medium text-slate-800">{u.nombre}</span>
                <span className="ml-2 text-slate-400">@{u.usuario}</span>
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{etiquetaRol[u.rol] ?? u.rol}</span>
              </div>
              <BotonEliminar action={eliminarUsuario} id={u.id} mensaje={`¿Eliminar al usuario ${u.nombre}?`} />
            </div>
          ))}
        </div>
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
