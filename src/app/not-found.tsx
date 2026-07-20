import Link from "next/link";

// Página 404. No recibe props (según la convención not-found.js).
export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-sky-50 text-3xl ring-1 ring-sky-100">
          🧊
        </span>
        <p className="mt-5 font-display text-4xl font-extrabold text-sky-600">
          404
        </p>
        <h1 className="mt-2 font-display text-xl font-bold text-slate-800">
          Página no encontrada
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          La página que buscas no existe o fue movida. Revisa la dirección o
          vuelve al tablero.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/"
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
          >
            Volver al tablero
          </Link>
        </div>
      </div>
    </div>
  );
}
