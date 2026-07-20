// Esqueleto a medida para /clientes. Imita el encabezado con botón de exportar,
// el formulario de registro, la barra de total por cobrar, la búsqueda y las
// tarjetas de cada cliente.
export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden="true">
      {/* Encabezado con botón exportar */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-80 max-w-full rounded-lg bg-slate-200" />
          <div className="h-4 w-96 max-w-full rounded bg-slate-100" />
        </div>
        <div className="h-9 w-40 rounded-xl bg-slate-100" />
      </div>

      {/* Formulario de registro */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`space-y-1.5 ${i === 0 || i === 4 ? "lg:col-span-2" : ""}`}>
            <div className="h-3 w-28 rounded bg-slate-100" />
            <div className="h-9 w-full rounded-lg bg-slate-100" />
          </div>
        ))}
        <div className="h-9 w-40 rounded-lg bg-slate-200 sm:col-span-2 lg:col-span-2" />
      </div>

      {/* Barra de total por cobrar */}
      <div className="flex items-center justify-between rounded-xl bg-slate-200 px-5 py-3">
        <div className="h-4 w-56 rounded bg-slate-100" />
        <div className="h-5 w-24 rounded bg-slate-100" />
      </div>

      {/* Búsqueda */}
      <div className="flex flex-wrap gap-2">
        <div className="h-10 flex-1 rounded-lg bg-slate-100" />
        <div className="h-10 w-24 rounded-lg bg-slate-200" />
      </div>

      {/* Tarjetas de clientes */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-slate-200" />
                <div className="h-3 w-56 max-w-full rounded bg-slate-100" />
              </div>
              <div className="flex items-center gap-6">
                <div className="h-9 w-20 rounded bg-slate-100" />
                <div className="h-9 w-20 rounded bg-slate-100" />
                <div className="h-7 w-24 rounded-lg bg-slate-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
