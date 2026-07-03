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
