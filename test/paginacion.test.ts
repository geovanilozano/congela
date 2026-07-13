import { describe, it, expect } from "vitest";
import { paginar } from "../src/lib/paginacion";

describe("paginar", () => {
  it("calcula el total de páginas y qué traer", () => {
    const p = paginar(45, 1, 20);
    expect(p.totalPaginas).toBe(3);
    expect(p.paginaActual).toBe(1);
    expect(p.skip).toBe(0);
    expect(p.take).toBe(20);
  });

  it("la segunda página salta los primeros registros", () => {
    const p = paginar(45, 2, 20);
    expect(p.skip).toBe(20);
    expect(p.paginaActual).toBe(2);
  });

  it("si piden una página más allá del final, se queda en la última", () => {
    const p = paginar(45, 9, 20);
    expect(p.paginaActual).toBe(3);
    expect(p.skip).toBe(40);
  });

  it("una página menor a 1 se ajusta a la primera", () => {
    expect(paginar(45, 0, 20).paginaActual).toBe(1);
    expect(paginar(45, -3, 20).paginaActual).toBe(1);
  });

  it("sin registros hay una sola página vacía", () => {
    const p = paginar(0, 1, 20);
    expect(p.totalPaginas).toBe(1);
    expect(p.paginaActual).toBe(1);
    expect(p.skip).toBe(0);
  });

  it("valores raros de página (NaN) caen en la primera", () => {
    expect(paginar(45, NaN, 20).paginaActual).toBe(1);
  });
});
