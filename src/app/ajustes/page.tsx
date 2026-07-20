import { db } from "@/lib/db";
import { BotonEliminar } from "@/components/BotonEliminar";
import { BotonGuardar } from "@/components/BotonGuardar";
import { SubirRespaldo } from "@/components/SubirRespaldo";
import { ROLES } from "@/lib/auth/permisos";
import { getAjuste } from "@/lib/ajustes";
import { borrarDatosDemo, crearUsuario, eliminarUsuario, guardarClaveOcr, guardarDatosNegocio, restaurarRespaldoAccion } from "./actions";

export const dynamic = "force-dynamic";

const etiquetaRol: Record<string, string> = { dueno: "Dueño", cajero: "Cajero", operario: "Operario" };

const ERRORES_RESPALDO: Record<string, string> = {
  sinArchivo: "Primero elige el archivo de respaldo (.json).",
  jsonInvalido: "Ese archivo no es un respaldo válido (no se pudo leer).",
  restauracion: "No se pudo restaurar el respaldo. No se cambió ningún dato.",
};

export default async function AjustesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; restaurado?: string }>;
}) {
  const sp = await searchParams;
  const [usuarios, claveOcr, negocioNombre, negocioNit, negocioDireccion, negocioTelefono, bitacora] = await Promise.all([
    db.usuario.findMany({ orderBy: { id: "asc" } }),
    getAjuste("anthropicApiKey"),
    getAjuste("negocioNombre"),
    getAjuste("negocioNit"),
    getAjuste("negocioDireccion"),
    getAjuste("negocioTelefono"),
    db.registroAuditoria.findMany({ orderBy: { fecha: "desc" }, take: 50 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">⚙️ Ajustes</h1>
        <p className="mt-1 text-sm text-slate-500">Datos del negocio, usuarios, copia de seguridad y limpieza de datos.</p>
      </div>

      {/* Datos del negocio (para la factura) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-700">🧾 Datos del negocio (para la factura)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Aparecen en el encabezado de las facturas. Todos son opcionales.
        </p>
        <form action={guardarDatosNegocio} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-slate-500">Nombre del negocio</span>
            <input name="negocioNombre" defaultValue={negocioNombre ?? ""} placeholder="Congela" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
          <label className="text-sm">
            <span className="text-slate-500">NIT o cédula</span>
            <input name="negocioNit" defaultValue={negocioNit ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
          <label className="text-sm">
            <span className="text-slate-500">Dirección</span>
            <input name="negocioDireccion" defaultValue={negocioDireccion ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
          <label className="text-sm">
            <span className="text-slate-500">Teléfono</span>
            <input name="negocioTelefono" defaultValue={negocioTelefono ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
          <BotonGuardar className="w-fit rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 sm:col-span-2">
            Guardar datos del negocio
          </BotonGuardar>
        </form>
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
          <input name="clave" required type="password" autoComplete="new-password" placeholder="Clave (mín. 4)" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
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

      {/* Lectura de facturas por foto (IA) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-700">📸 Leer facturas por foto (IA)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Pega tu <b>clave de API</b> para poder leer los datos de los recibos con una foto (en la
          pantalla de Servicios). Tiene un pequeño costo por uso.{" "}
          {claveOcr ? (
            <span className="font-medium text-emerald-600">✓ Clave configurada.</span>
          ) : (
            <span className="font-medium text-amber-600">Aún no has configurado la clave.</span>
          )}
        </p>
        <form action={guardarClaveOcr} className="mt-3 flex flex-wrap items-center gap-2">
          <input
            name="anthropicApiKey"
            type="password"
            placeholder={claveOcr ? "•••••••••• (ya configurada, pega otra para cambiarla)" : "sk-ant-..."}
            className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <BotonGuardar className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">
            Guardar clave
          </BotonGuardar>
        </form>
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

        <div className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-700">Restaurar un respaldo</h3>
          <p className="mt-1 text-sm text-slate-500">
            Carga un archivo de respaldo para recuperar la información. <b>Reemplaza todos los
            datos actuales</b> (los usuarios y sus claves se conservan).
          </p>

          {sp.restaurado && (
            <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
              ✓ Respaldo restaurado ({sp.restaurado} registros).
            </div>
          )}
          {sp.error && ERRORES_RESPALDO[sp.error] && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {ERRORES_RESPALDO[sp.error]}
            </div>
          )}

          <SubirRespaldo action={restaurarRespaldoAccion} />
        </div>
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

      {/* Bitácora de acciones sensibles */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-700">🕵️ Bitácora de movimientos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Quién hizo qué y cuándo en lo que toca el dinero: cierres de caja, ventas editadas o
          borradas, abonos, créditos, usuarios y borrados masivos. Últimos 50 registros.
        </p>

        {bitacora.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Aún no hay movimientos registrados.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">Cuándo</th>
                  <th>Quién</th>
                  <th>Acción</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {bitacora.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="whitespace-nowrap py-1.5 text-slate-500">
                      {new Date(r.fecha).toLocaleString("es-CO", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="font-medium text-slate-700">{r.usuarioNombre}</span>
                      {r.rol && <span className="ml-1 text-xs text-slate-400">({etiquetaRol[r.rol] ?? r.rol})</span>}
                    </td>
                    <td className="whitespace-nowrap">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          r.accion === "eliminar" || r.accion === "anular"
                            ? "bg-red-50 text-red-700"
                            : r.accion === "cerrar" || r.accion === "restaurar"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {r.accion} {r.entidad}
                      </span>
                    </td>
                    <td className="text-slate-600">{r.detalle ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
