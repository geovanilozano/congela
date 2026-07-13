// Cálculo de paginación para listados. Puro: sin dependencias de base de datos ni UI.

export interface Paginacion {
  paginaActual: number;
  totalPaginas: number;
  skip: number; // registros a saltar en la consulta
  take: number; // registros por página
}

/**
 * A partir del total de registros y la página pedida, calcula qué traer.
 * Ajusta la página a un rango válido (1..totalPaginas), aunque pidan una fuera de rango
 * o un valor inválido.
 */
export function paginar(totalRegistros: number, paginaPedida: number, porPagina = 20): Paginacion {
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / porPagina));
  const pedida = Number.isFinite(paginaPedida) ? Math.floor(paginaPedida) : 1;
  const paginaActual = Math.min(totalPaginas, Math.max(1, pedida));
  return {
    paginaActual,
    totalPaginas,
    skip: (paginaActual - 1) * porPagina,
    take: porPagina,
  };
}
