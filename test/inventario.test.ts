import { describe, it, expect } from "vitest";
import { bajoStock, necesitaReposicion, aplicarMovimiento } from "../src/lib/inventario";

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

describe("aplicarMovimiento", () => {
  it("una entrada suma al stock", () => {
    const r = aplicarMovimiento(30, 20, "entrada");
    expect(r).toEqual({ ok: true, delta: 20, nuevoStock: 50 });
  });

  it("una salida resta del stock", () => {
    const r = aplicarMovimiento(30, 20, "salida");
    expect(r).toEqual({ ok: true, delta: -20, nuevoStock: 10 });
  });

  it("una salida puede dejar el stock exactamente en 0", () => {
    const r = aplicarMovimiento(30, 30, "salida");
    expect(r).toEqual({ ok: true, delta: -30, nuevoStock: 0 });
  });

  it("rechaza una salida mayor al stock disponible (no descuadra el libro)", () => {
    // Este era el bug: antes el stock se topaba en 0 pero se registraba -50,
    // dejando el libro de movimientos en desacuerdo con el stock real.
    const r = aplicarMovimiento(30, 50, "salida");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.disponible).toBe(30);
  });

  it("cuando la salida es válida, el delta siempre cuadra con el nuevo stock", () => {
    const r = aplicarMovimiento(30, 20, "salida");
    if (r.ok) expect(30 + r.delta).toBe(r.nuevoStock);
  });

  it("rechaza cantidades cero o negativas", () => {
    expect(aplicarMovimiento(30, 0, "entrada").ok).toBe(false);
    expect(aplicarMovimiento(30, -5, "salida").ok).toBe(false);
  });
});
