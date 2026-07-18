// Qué rutas puede usar cada rol. Se usa tanto en el middleware (bloqueo) como en
// el menú lateral (mostrar solo lo permitido).
export type Rol = "dueno" | "cajero" | "operario";

export const ROLES: { valor: Rol; etiqueta: string }[] = [
  { valor: "dueno", etiqueta: "Dueño (todo)" },
  { valor: "cajero", etiqueta: "Cajero (ventas y caja)" },
  { valor: "operario", etiqueta: "Operario (producción e inventario)" },
];

// Rutas de apoyo que necesita cualquiera que haya iniciado sesión:
// ver la foto de un comprobante y leer una factura por foto desde su propia pantalla.
const COMUNES = ["/api/archivo", "/api/ocr", "/api/ocr-gasto"];

const PERMISOS: Record<string, string[] | "*"> = {
  dueno: "*",
  // El cajero exporta ventas y gastos desde Reportes (el respaldo completo es solo del dueño:
  // eso lo comprueba la propia ruta /api/export).
  cajero: ["/", "/reportes", "/ventas", "/caja", "/compras", "/clientes", "/api/export", ...COMUNES],
  operario: ["/", "/produccion", "/inventario", "/mantenimiento", ...COMUNES],
};

/** True si el rol puede acceder a esa ruta. */
export function puedeAcceder(rol: string, ruta: string): boolean {
  const p = PERMISOS[rol];
  if (!p) return false;
  if (p === "*") return true;
  return p.some((x) => (x === "/" ? ruta === "/" : ruta.startsWith(x)));
}
