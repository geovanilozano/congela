import { describe, it, expect } from "vitest";
import { bajoStock, necesitaReposicion } from "../src/lib/inventario";

const items = [
  { nombre: "Bolsas 5kg", stock: 10, stockMinimo: 50 },
  { nombre: "Bolsas 3kg", stock: 200, stockMinimo: 50 },
  { nombre: "Sal", stock: 5, stockMinimo: 5 },
];

describe("inventario", () => {
  it("marca reposición cuando el stock está en o por debajo del mínimo", () => {
    expect(necesitaReposicion(items[0])).toBe(true); // 10 <= 50
    expect(necesitaReposicion(items[1])).toBe(false); // 200 > 50
    expect(necesitaReposicion(items[2])).toBe(true); // 5 <= 5
  });

  it("bajoStock devuelve solo los ítems que necesitan reposición", () => {
    const r = bajoStock(items);
    expect(r.map((i) => i.nombre)).toEqual(["Bolsas 5kg", "Sal"]);
  });
});
