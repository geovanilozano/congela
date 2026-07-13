// Lógica de inventario: detectar ítems que necesitan reposición.
// Puro: sin dependencias de base de datos ni UI.

export interface ItemStock {
  nombre: string;
  stock: number;
  stockMinimo: number;
}

/** True si el stock está en o por debajo del mínimo. */
export const necesitaReposicion = (item: ItemStock): boolean => item.stock <= item.stockMinimo;

/** Filtra los ítems que necesitan reposición. */
export const bajoStock = <T extends ItemStock>(items: T[]): T[] =>
  items.filter(necesitaReposicion);

export type TipoMovimiento = "entrada" | "salida";

export type ResultadoMovimiento =
  | { ok: true; delta: number; nuevoStock: number }
  | { ok: false; razon: "cantidad" | "sinStock"; disponible: number };

/**
 * Calcula el resultado de una entrada o salida de inventario.
 *
 * Clave: el `delta` que se aplica al stock es EXACTAMENTE el que se debe registrar en el
 * libro de movimientos, para que ambos siempre cuadren. Por eso no se permite sacar más
 * de lo que hay (antes el stock se topaba en 0 pero se registraba la salida completa, y
 * el libro quedaba en desacuerdo con el stock para siempre).
 */
export function aplicarMovimiento(
  stockActual: number,
  cantidad: number,
  tipo: TipoMovimiento,
): ResultadoMovimiento {
  if (!(cantidad > 0)) return { ok: false, razon: "cantidad", disponible: stockActual };

  if (tipo === "salida") {
    if (cantidad > stockActual) return { ok: false, razon: "sinStock", disponible: stockActual };
    return { ok: true, delta: -cantidad, nuevoStock: stockActual - cantidad };
  }

  return { ok: true, delta: cantidad, nuevoStock: stockActual + cantidad };
}
