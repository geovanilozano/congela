import { describe, it, expect } from "vitest";
import {
  costoPorBolsa,
  margenPorBolsa,
  puntoEquilibrio,
  recuperacionInversion,
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
