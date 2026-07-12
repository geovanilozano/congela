// Construye un filtro de fecha para Prisma a partir de los parámetros ?desde=&hasta=.
// Devuelve undefined si no hay filtro (para no afectar la consulta).
export function rangoFechas(sp?: { desde?: string; hasta?: string }) {
  if (!sp) return undefined;
  const filtro: { gte?: Date; lte?: Date } = {};
  if (sp.desde) filtro.gte = new Date(sp.desde);
  if (sp.hasta) {
    const h = new Date(sp.hasta);
    h.setHours(23, 59, 59, 999); // incluir todo el día "hasta"
    filtro.lte = h;
  }
  return filtro.gte || filtro.lte ? filtro : undefined;
}
