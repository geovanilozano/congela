// Qué rutas puede usar cada rol. Se usa tanto en el middleware (bloqueo) como en
// el menú lateral (mostrar solo lo permitido).
export type Rol = "dueno" | "cajero" | "operario" | "medidores";

export const ROLES: { valor: Rol; etiqueta: string }[] = [
  { valor: "dueno", etiqueta: "Dueño (todo)" },
  { valor: "cajero", etiqueta: "Cajero (ventas y caja)" },
  { valor: "operario", etiqueta: "Operario (producción e inventario)" },
  { valor: "medidores", etiqueta: "Medidores (solo cobro de energía)" },
];

// Rutas de apoyo que necesita cualquiera que haya iniciado sesión:
// ver la foto de un comprobante y leer una factura por foto desde su propia pantalla.
const COMUNES = ["/api/archivo", "/api/ocr", "/api/ocr-gasto"];

const PERMISOS: Record<string, string[] | "*"> = {
  dueno: "*",
  // El cajero exporta ventas y gastos desde Reportes (el respaldo completo es solo del dueño:
  // eso lo comprueba la propia ruta /api/export).
  cajero: ["/", "/reportes", "/ventas", "/caja", "/compras", "/clientes", "/api/export", "/api/export-clientes", ...COMUNES],
  operario: ["/", "/produccion", "/inventario", "/productos", "/mantenimiento", ...COMUNES],
  // Rol acotado: SOLO el módulo de medidores (facturación de energía a clientes). No ve el
  // tablero ni las finanzas; arranca directo en /medidores (ver inicioDeRol).
  medidores: ["/medidores", ...COMUNES],
};

/** True si el rol puede acceder a esa ruta. */
export function puedeAcceder(rol: string, ruta: string): boolean {
  const p = PERMISOS[rol];
  if (!p) return false;
  if (p === "*") return true;
  return p.some((x) => (x === "/" ? ruta === "/" : ruta.startsWith(x)));
}

/** Pantalla de inicio de cada rol (a dónde llevarlo al entrar o cuando no tiene permiso).
 *  Debe ser una ruta que el rol SÍ pueda ver, para no caer en un bucle de redirección. */
export function inicioDeRol(rol: string): string {
  return rol === "medidores" ? "/medidores" : "/";
}
