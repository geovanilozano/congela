// Esqueleto a medida para /ventas. Imita el título, el formulario de registro,
// la barra de total pendiente, el filtro de fecha y la tabla de ventas.
export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden="true">
      {/* Título */}
      <div className="space-y-2">
        <div className="h-7 w-40 rounded-lg bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-100" />
      </div>

      {/* Formulario de registro */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-20 rounded bg-slate-100" />
            <div className="h-9 w-full rounded-lg bg-slate-100" />
          </div>
        ))}
        <div className="h-9 w-36 rounded-lg bg-slate-200 sm:col-span-2 lg:col-span-6" />
      </div>

      {/* Barra de total pendiente */}
      <div className="flex items-center justify-between rounded-xl bg-slate-200 px-5 py-3">
        <div className="h-4 w-64 rounded bg-slate-100" />
        <div className="h-5 w-24 rounded bg-slate-100" />
      </div>

      {/* Filtro de fecha */}
      <div className="h-14 rounded-xl border border-slate-200 bg-white shadow-sm" />

      {/* Tabla de ventas */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="h-4 w-40 rounded bg-slate-200" />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <div className="h-3 w-20 rounded bg-slate-100" />
              <div className="h-3 flex-1 rounded bg-slate-200" />
              <div className="h-3 w-24 rounded bg-slate-100" />
              <div className="h-3 w-16 rounded bg-slate-100" />
              <div className="h-3 w-20 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
