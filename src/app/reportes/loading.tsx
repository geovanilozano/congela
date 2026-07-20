// Esqueleto a medida para /reportes. Imita el encabezado con botones, el filtro de
// fecha, las tarjetas de indicadores (KPIs) y los bloques de gráficos.
export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse" aria-hidden="true">
      {/* Encabezado con botones de exportar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-64 rounded-lg bg-slate-200" />
          <div className="h-4 w-80 max-w-full rounded bg-slate-100" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 w-32 rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>

      {/* Filtro de fecha */}
      <div className="h-14 rounded-xl border border-slate-200 bg-white shadow-sm" />

      {/* Recuperación de inversión (barra de progreso) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="h-4 w-52 rounded bg-slate-200" />
          <div className="h-6 w-32 rounded-full bg-slate-100" />
        </div>
        <div className="mt-3 h-3 w-full rounded-full bg-slate-100" />
        <div className="mt-2 h-3 w-3/4 rounded bg-slate-100" />
      </div>

      {/* Utilidad neta del mes */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="h-3 w-40 rounded bg-slate-100" />
            <div className="h-8 w-48 rounded bg-slate-200" />
          </div>
          <div className="flex gap-6">
            <div className="h-10 w-24 rounded bg-slate-100" />
            <div className="h-10 w-24 rounded bg-slate-100" />
          </div>
        </div>
      </div>

      {/* Indicadores clave (KPIs) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="h-3 w-24 rounded bg-slate-100" />
            <div className="mt-2 h-6 w-20 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Bloques de gráficos */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 h-4 w-56 rounded bg-slate-200" />
          <div className="h-56 w-full rounded-lg bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
