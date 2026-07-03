import { describe, it, expect } from "vitest";
import { repartir, ReglaFondo } from "../src/lib/finance/fondos";

const reglas: ReglaFondo[] = [
  { fondo: "arriendo", tipo: "fijo", valorCents: 30_000, prioridad: 1, activo: true },
  { fondo: "credito", tipo: "fijo", valorCents: 20_000, prioridad: 2, activo: true },
  { fondo: "reserva", tipo: "porcentaje", valor: 0.1, prioridad: 3, activo: true },
  { fondo: "utilidad", tipo: "resto", prioridad: 99, activo: true },
];

describe("repartir", () => {
  it("aparta fijos, porcentaje y deja el resto en utilidad", () => {
    const r = repartir(100_000, reglas);
    expect(r.arriendo).toBe(30_000);
    expect(r.credito).toBe(20_000);
    expect(r.reserva).toBe(10_000); // 10% de 100.000
    expect(r.utilidad).toBe(40_000); // lo que sobra
  });
  it("la suma repartida es igual al ingreso", () => {
    const r = repartir(100_000, reglas);
    const suma = Object.values(r).reduce((a, b) => a + b, 0);
    expect(suma).toBe(100_000);
  });
  it("si un fondo fijo está inactivo (credito pagado), su dinero pasa al resto", () => {
    const reglasPagado = reglas.map((x) => (x.fondo === "credito" ? { ...x, activo: false } : x));
    const r = repartir(100_000, reglasPagado);
    expect(r.credito ?? 0).toBe(0);
    expect(r.utilidad).toBe(60_000); // los 20.000 del crédito ahora son utilidad
  });
  it("si el ingreso no alcanza, los fijos toman lo disponible por prioridad", () => {
    const r = repartir(25_000, reglas);
    expect(r.arriendo).toBe(25_000);
    expect(r.credito ?? 0).toBe(0);
    expect(r.utilidad ?? 0).toBe(0);
  });
});
