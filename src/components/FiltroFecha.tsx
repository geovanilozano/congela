// Filtro por rango de fecha (desde/hasta). Es un formulario GET: al enviar,
// recarga la misma página con ?desde=&hasta= y el servidor filtra los datos.
export function FiltroFecha({ desde, hasta }: { desde?: string; hasta?: string }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <label className="text-xs text-slate-500">
        Desde
        <input type="date" name="desde" defaultValue={desde} className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs text-slate-500">
        Hasta
        <input type="date" name="hasta" defaultValue={hasta} className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
      </label>
      <button className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700">Filtrar</button>
      <a href="?" className="px-2 py-1.5 text-sm text-slate-500 hover:underline">Limpiar</a>
    </form>
  );
}
