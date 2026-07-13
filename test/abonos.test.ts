import { describe, it, expect } from "vitest";
import { distribuirAbono } from "../src/lib/finance/abonos";

// Cuotas de $100.000 cada una, sin nada abonado (ordenadas de la más vieja a la más nueva).
const cuotas = [
  { id: 1, cuotaCents: 100_000, abonadoCents: 0 },
  { id: 2, cuotaCents: 100_000, abonadoCents: 0 },
  { id: 3, cuotaCents: 100_000, abonadoCents: 0 },
];

describe("distribuirAbono", () => {
  it("un abono menor a una cuota la deja parcial (no pagada)", () => {
    const r = distribuirAbono(cuotas, 40_000);
    expect(r.actualizaciones).toEqual([{ id: 1, abonadoCents: 40_000, pagada: false }]);
    expect(r.sobranteCents).toBe(0);
  });

  it("un abono igual a la cuota la deja pagada", () => {
    const r = distribuirAbono(cuotas, 100_000);
    expect(r.actualizaciones).toEqual([{ id: 1, abonadoCents: 100_000, pagada: true }]);
  });

  it("un abono grande adelanta varias cuotas (más vieja primero)", () => {
    const r = distribuirAbono(cuotas, 250_000);
    expect(r.actualizaciones).toEqual([
      { id: 1, abonadoCents: 100_000, pagada: true },
      { id: 2, abonadoCents: 100_000, pagada: true },
      { id: 3, abonadoCents: 50_000, pagada: false },
    ]);
    expect(r.sobranteCents).toBe(0);
  });

  it("respeta lo ya abonado en una cuota parcial", () => {
    const parciales = [{ id: 1, cuotaCents: 100_000, abonadoCents: 30_000 }, cuotas[1]];
    const r = distribuirAbono(parciales, 80_000);
    // A la cuota 1 le faltaban 70.000 -> queda pagada; los 10.000 pasan a la cuota 2.
    expect(r.actualizaciones).toEqual([
      { id: 1, abonadoCents: 100_000, pagada: true },
      { id: 2, abonadoCents: 10_000, pagada: false },
    ]);
  });

  it("si el abono supera todo lo que falta, informa el sobrante", () => {
    const r = distribuirAbono(cuotas, 350_000);
    expect(r.actualizaciones.every((a) => a.pagada)).toBe(true);
    expect(r.sobranteCents).toBe(50_000);
  });

  it("un abono de cero no cambia nada", () => {
    const r = distribuirAbono(cuotas, 0);
    expect(r.actualizaciones).toEqual([]);
    expect(r.sobranteCents).toBe(0);
  });
});
