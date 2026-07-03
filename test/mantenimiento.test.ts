import { describe, it, expect } from "vitest";
import { estadoMantenimiento } from "../src/lib/mantenimiento";

const hoy = new Date("2026-07-03T12:00:00");

describe("estadoMantenimiento", () => {
  it("si ya se realizó, está realizado", () => {
    expect(
      estadoMantenimiento({ fechaProgramada: new Date("2026-06-01"), fechaRealizada: new Date("2026-06-02") }, hoy),
    ).toBe("realizado");
  });

  it("si la fecha ya pasó y no se hizo, está vencido", () => {
    expect(
      estadoMantenimiento({ fechaProgramada: new Date("2026-07-01"), fechaRealizada: null }, hoy),
    ).toBe("vencido");
  });

  it("si falta una semana o menos, está próximo", () => {
    expect(
      estadoMantenimiento({ fechaProgramada: new Date("2026-07-08"), fechaRealizada: null }, hoy),
    ).toBe("proximo");
  });

  it("si falta más de una semana, está programado", () => {
    expect(
      estadoMantenimiento({ fechaProgramada: new Date("2026-08-01"), fechaRealizada: null }, hoy),
    ).toBe("programado");
  });
});
