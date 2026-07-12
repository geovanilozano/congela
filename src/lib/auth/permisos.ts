// Qué rutas puede usar cada rol. Se usa tanto en el middleware (bloqueo) como en
// el menú lateral (mostrar solo lo permitido).
export type Rol = "dueno" | "cajero" | "operario";

export const ROLES: { valor: Rol; etiqueta: string }[] = [
  { valor: "dueno", etiqueta: "Dueño (todo)" },
  { valor: "cajero", etiqueta: "Cajero (ventas y caja)" },
  { valor: "operario", etiqueta: "Operario (producción e inventario)" },
];

const PERMISOS: Record<string, string[] | "*"> = {
  dueno: "*",
  cajero: ["/", "/reportes", "/ventas", "/caja", "/compras"],
  operario: ["/", "/produccion", "/inventario", "/mantenimiento"],
};

/** True si el rol puede acceder a esa ruta. */
export function puedeAcceder(rol: string, ruta: string): boolean {
  const p = PERMISOS[rol];
  if (!p) return false;
  if (p === "*") return true;
  return p.some((x) => (x === "/" ? ruta === "/" : ruta.startsWith(x)));
}
