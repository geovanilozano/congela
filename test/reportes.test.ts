import { describe, it, expect } from "vitest";
import {
  costoPorBolsa,
  margenPorBolsa,
  puntoEquilibrio,
  recuperacionInversion,
  resumenPorMes,
} from "../src/lib/finance/reportes";

describe("reportes financieros", () => {
  it("costo por bolsa reparte los gastos entre las bolsas producidas", () => {
    expect(costoPorBolsa(1_000_000, 500)).toBe(2000); // 1.000.000 / 500 = 2000 centavos
  });

  it("costo por bolsa es null (indefinido) si no hay producción", () => {
    // Antes devolvía 0, y eso hacía que el margen y el punto de equilibrio se vieran
    // como si el negocio fuera 100% rentable en un mes sin producción cargada.
    expect(costoPorBolsa(1_000_000, 0)).toBeNull();
  });

  it("margen por bolsa es precio de venta menos costo", () => {
    expect(margenPorBolsa(3000, 2000)).toBe(1000);
  });

  it("margen por bolsa es null si el costo es indefinido", () => {
    expect(margenPorBolsa(3000, null)).toBeNull();
  });

  it("punto de equilibrio: bolsas necesarias para cubrir los gastos", () => {
    // gastos 1.000.000, margen 1000 por bolsa -> 1000 bolsas
    expect(puntoEquilibrio(1_000_000, 1000)).toBe(1000);
  });

  it("punto de equilibrio redondea hacia arriba", () => {
    expect(puntoEquilibrio(1_000_050, 1000)).toBe(1001);
  });

  it("punto de equilibrio es null si el margen no es positivo (se pierde por bolsa)", () => {
    expect(puntoEquilibrio(1_000_000, 0)).toBeNull();
    expect(puntoEquilibrio(1_000_000, -500)).toBeNull();
  });

  it("recuperación de inversión: porcentaje y faltante", () => {
    const r = recuperacionInversion(2_000_000, 500_000);
    expect(r.porcentaje).toBe(25);
    expect(r.faltanteCents).toBe(1_500_000);
    expect(r.recuperado).toBe(false);
  });

  it("recuperación marca recuperado cuando la utilidad iguala o supera la inversión", () => {
    const r = recuperacionInversion(1_000_000, 1_200_000);
    expect(r.porcentaje).toBe(100); // se limita a 100
    expect(r.faltanteCents).toBe(0);
    expect(r.recuperado).toBe(true);
  });
});

describe("resumenPorMes", () => {
  it("agrupa ventas y gastos por mes (hora local) y calcula la utilidad", () => {
    const ventas = [
      { fecha: new Date(2026, 5, 10), totalCents: 100_000 }, // junio
      { fecha: new Date(2026, 5, 20), totalCents: 50_000 }, // junio
      { fecha: new Date(2026, 6, 3), totalCents: 200_000 }, // julio
    ];
    const gastos = [
      { fecha: new Date(2026, 5, 15), valorCents: 40_000 }, // junio
      { fecha: new Date(2026, 6, 1), valorCents: 30_000 }, // julio
    ];
    const r = resumenPorMes(ventas, gastos);

    expect(r).toEqual([
      { mes: "2026-06", ingresosCents: 150_000, gastosCents: 40_000, utilidadCents: 110_000 },
      { mes: "2026-07", ingresosCents: 200_000, gastosCents: 30_000, utilidadCents: 170_000 },
    ]);
  });

  it("una venta a las 8pm cuenta en su mes local, no en el siguiente por UTC", () => {
    // 31 de julio 8pm local no debe caer en agosto.
    const ventas = [{ fecha: new Date(2026, 6, 31, 20, 0, 0), totalCents: 10_000 }];
    const r = resumenPorMes(ventas, []);
    expect(r[0].mes).toBe("2026-07");
  });

  it("incluye meses con solo gastos", () => {
    const r = resumenPorMes([], [{ fecha: new Date(2026, 0, 5), valorCents: 5_000 }]);
    expect(r).toEqual([{ mes: "2026-01", ingresosCents: 0, gastosCents: 5_000, utilidadCents: -5_000 }]);
  });

  it("devuelve los meses en orden ascendente", () => {
    const ventas = [
      { fecha: new Date(2026, 6, 1), totalCents: 1 },
      { fecha: new Date(2026, 2, 1), totalCents: 1 },
      { fecha: new Date(2026, 4, 1), totalCents: 1 },
    ];
    expect(resumenPorMes(ventas, []).map((m) => m.mes)).toEqual(["2026-03", "2026-05", "2026-07"]);
  });

  it("sin datos devuelve lista vacía", () => {
    expect(resumenPorMes([], [])).toEqual([]);
  });
});
