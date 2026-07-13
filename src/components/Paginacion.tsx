// Navegación de páginas (‹ anterior / siguiente ›) que conserva los demás filtros de
// la URL (buscar, desde, hasta). Sin JS: son enlaces. Se oculta si hay una sola página.
import Link from "next/link";

export function Paginacion({
  paginaActual,
  totalPaginas,
  params,
}: {
  paginaActual: number;
  totalPaginas: number;
  params: Record<string, string | undefined>;
}) {
  if (totalPaginas <= 1) return null;

  const href = (pagina: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k !== "pagina" && v) qs.set(k, v);
    }
    qs.set("pagina", String(pagina));
    return `?${qs.toString()}`;
  };

  const claseBoton = "rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50";
  const claseInactivo = "rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-300";

  return (
    <div className="flex items-center justify-between gap-3">
      {paginaActual > 1 ? (
        <Link href={href(paginaActual - 1)} className={claseBoton}>‹ Anterior</Link>
      ) : (
        <span className={claseInactivo}>‹ Anterior</span>
      )}
      <span className="text-sm text-slate-500">Página {paginaActual} de {totalPaginas}</span>
      {paginaActual < totalPaginas ? (
        <Link href={href(paginaActual + 1)} className={claseBoton}>Siguiente ›</Link>
      ) : (
        <span className={claseInactivo}>Siguiente ›</span>
      )}
    </div>
  );
}
