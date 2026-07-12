import { db } from "@/lib/db";
import { getSesion } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { registrarPrimerUsuario, iniciarSesion } from "./actions";
import { BotonGuardar } from "@/components/BotonGuardar";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSesion()) redirect("/");

  const sp = await searchParams;
  const hayUsuarios = (await db.usuario.count()) > 0;
  const primerUso = !hayUsuarios;

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-3xl">🧊</div>
          <h1 className="mt-3 font-display text-2xl font-bold text-white">Congela</h1>
          <p className="text-sm text-slate-400">Control del negocio de hielo</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-6 shadow-xl">
          {primerUso ? (
            <>
              <h2 className="font-display text-lg font-bold text-slate-800">Crea tu usuario</h2>
              <p className="mt-1 text-sm text-slate-500">
                Es la primera vez. Crea el usuario <b>Dueño</b> (acceso total).
              </p>
              {sp.error === "datos" && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  Revisa los datos: la clave debe tener al menos 4 caracteres.
                </p>
              )}
              <form action={registrarPrimerUsuario} className="mt-4 space-y-3">
                <Campo label="Tu nombre" name="nombre" type="text" placeholder="Ej: Geovani" />
                <Campo label="Usuario" name="usuario" type="text" placeholder="Ej: geovani" />
                <Campo label="Clave" name="clave" type="password" placeholder="Mínimo 4 caracteres" />
                <BotonGuardar className="w-full rounded-lg bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">
                  Crear usuario y entrar
                </BotonGuardar>
              </form>
            </>
          ) : (
            <>
              <h2 className="font-display text-lg font-bold text-slate-800">Iniciar sesión</h2>
              <p className="mt-1 text-sm text-slate-500">Ingresa tu usuario y clave.</p>
              {sp.error === "1" && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  Usuario o clave incorrectos.
                </p>
              )}
              <form action={iniciarSesion} className="mt-4 space-y-3">
                <Campo label="Usuario" name="usuario" type="text" placeholder="Tu usuario" />
                <Campo label="Clave" name="clave" type="password" placeholder="Tu clave" />
                <BotonGuardar className="w-full rounded-lg bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">
                  Entrar
                </BotonGuardar>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Campo({ label, name, type, placeholder }: { label: string; name: string; type: string; placeholder?: string }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600">{label}</span>
      <input
        name={name}
        type={type}
        required
        placeholder={placeholder}
        autoComplete="off"
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
      />
    </label>
  );
}
