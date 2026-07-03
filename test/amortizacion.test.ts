import { describe, it, expect } from "vitest";
import { generarAmortizacion } from "../src/lib/finance/amortizacion";

describe("generarAmortizacion", () => {
  it("genera N cuotas y deja saldo final en 0", () => {
    const tabla = generarAmortizacion({ montoCents: 1_000_000, tasaMensual: 0.02, numCuotas: 12 });
    expect(tabla).toHaveLength(12);
    expect(tabla[11].saldoCents).toBe(0);
  });
  it("la primera cuota tiene el mayor interés", () => {
    const tabla = generarAmortizacion({ montoCents: 1_000_000, tasaMensual: 0.02, numCuotas: 12 });
    expect(tabla[0].interesCents).toBeGreaterThan(tabla[11].interesCents);
  });
  it("la suma de capital equivale al monto prestado", () => {
    const tabla = generarAmortizacion({ montoCents: 1_000_000, tasaMensual: 0.02, numCuotas: 12 });
    const sumaCapital = tabla.reduce((a, c) => a + c.capitalCents, 0);
    expect(sumaCapital).toBe(1_000_000);
  });
  it("tasa 0 reparte el capital en partes iguales sin interés", () => {
    const tabla = generarAmortizacion({ montoCents: 1_200, tasaMensual: 0, numCuotas: 12 });
    expect(tabla[0].interesCents).toBe(0);
    expect(tabla[0].capitalCents).toBe(100);
  });
});
