// Manejo de fechas en la HORA LOCAL del negocio.
//
// Ojo: `new Date("2026-07-13")` NO sirve. JavaScript interpreta ese formato como
// medianoche UTC, así que en Colombia (UTC-5) se convierte en el 12 de julio a las
// 7pm: las fechas se guardaban y se filtraban corridas un día hacia atrás.
// Por eso aquí todo se construye con `new Date(año, mes, día)`, que sí es local.

/** Parte una fecha "AAAA-MM-DD" en sus números. Null si no tiene ese formato. */
function partes(valor: string): { a: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor.trim());
  if (!m) return null;
  return { a: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/**
 * Convierte la fecha que escribió el usuario ("2026-07-13") en el comienzo de ese
 * día en hora local. Devuelve null si viene vacía.
 */
export function fechaLocal(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const p = partes(String(valor));
  if (!p) {
    // Otro formato (ej. una fecha con hora): se deja que JS lo interprete.
    const d = new Date(String(valor));
    return isNaN(d.getTime()) ? null : d;
  }
  return new Date(p.a, p.m - 1, p.d, 0, 0, 0, 0);
}

/**
 * Igual que `fechaLocal`, pero si no viene fecha usa el momento actual.
 * Es lo que usan los formularios donde la fecha es opcional (gastos, producción…).
 */
export function fechaLocalODefecto(valor: FormDataEntryValue | null): Date {
  return fechaLocal(valor ? String(valor) : null) ?? new Date();
}

/**
 * Convierte una fecha a "AAAA-MM-DD" en hora LOCAL, para mostrarla en un <input type="date">
 * o exportarla a Excel.
 *
 * Ojo: NO usar `toISOString()` para esto. Pasa la fecha a UTC, así que una venta de las
 * 8pm en Colombia salía con la fecha del día siguiente (y al editarla, el formulario la
 * movía un día sin que nadie lo pidiera).
 */
export function fechaParaInput(fecha: Date | string | null | undefined): string {
  if (!fecha) return "";
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (isNaN(d.getTime())) return "";

  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** El último instante del día (23:59:59.999) en hora local. */
function finDelDia(valor: string): Date | null {
  const p = partes(valor);
  if (!p) return null;
  return new Date(p.a, p.m - 1, p.d, 23, 59, 59, 999);
}

/**
 * Construye el filtro de fecha para Prisma a partir de ?desde=&hasta=.
 * El rango va del comienzo del día "desde" al final del día "hasta", en hora local.
 * Devuelve undefined si no hay filtro (para no afectar la consulta).
 */
export function rangoFechas(sp?: { desde?: string; hasta?: string }) {
  if (!sp) return undefined;
  const filtro: { gte?: Date; lte?: Date } = {};

  const desde = sp.desde ? fechaLocal(sp.desde) : null;
  if (desde) filtro.gte = desde;

  const hasta = sp.hasta ? finDelDia(sp.hasta) : null;
  if (hasta) filtro.lte = hasta;

  return filtro.gte || filtro.lte ? filtro : undefined;
}
