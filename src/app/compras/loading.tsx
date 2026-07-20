// Esqueleto a medida para /compras. Imita el título, las tarjetas de totales por
// categoría, el filtro de fecha, el formulario de registro y la tabla de gastos.
export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden="true">
      {/* Título */}
      <div className="space-y-2">
        <div className="h-7 w-56 rounded-lg bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-100" />
      </div>

      {/* Tarjetas de totales / por categoría */}
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="h-3 w-20 rounded bg-slate-100" />
            <div className="mt-2 h-6 w-24 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Filtro de fecha */}
      <div className="h-14 rounded-xl border border-slate-200 bg-white shadow-sm" />

      {/* Formulario de registro */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`space-y-1.5 ${i === 1 || i === 5 ? "lg:col-span-2" : ""}`}>
            <div className="h-3 w-24 rounded bg-slate-100" />
            <div className="h-9 w-full rounded-lg bg-slate-100" />
          </div>
        ))}
        <div className="h-9 w-full rounded-lg bg-slate-200 sm:col-span-2 lg:col-span-5" />
      </div>

      {/* Tabla de gastos */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="h-4 w-40 rounded bg-slate-200" />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <div className="h-3 w-20 rounded bg-slate-100" />
              <div className="h-3 w-20 rounded bg-slate-100" />
              <div className="h-3 flex-1 rounded bg-slate-200" />
              <div className="h-3 w-24 rounded bg-slate-100" />
              <div className="h-3 w-20 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>

      {/* Paginación */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-9 rounded-lg bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
