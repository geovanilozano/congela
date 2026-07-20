"use client"; // Los límites de error deben ser Client Components

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  // En esta versión de Next (v16.2.0) la forma recomendada de reintentar es
  // `unstable_retry`, que reemplaza al antiguo `reset`. Vuelve a obtener los
  // datos y a renderizar el segmento que falló.
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Deja rastro en consola para depurar (sin telemetría externa).
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-sky-50 text-3xl ring-1 ring-sky-100">
          🧊
        </span>
        <h1 className="mt-5 font-display text-xl font-bold text-slate-800">
          Algo salió mal
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Ocurrió un error inesperado al cargar esta sección. Puedes intentarlo
          de nuevo o volver al tablero.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Volver al tablero
          </Link>
        </div>
      </div>
    </div>
  );
}
