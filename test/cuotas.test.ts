import { describe, it, expect } from "vitest";
import { estadoCuota } from "../src/lib/finance/cuotas";

const hoy = new Date("2026-07-03T12:00:00");

describe("estadoCuota", () => {
  it("una cuota ya pagada está pagada, sin importar la fecha", () => {
    expect(estadoCuota({ fechaVencimiento: new Date("2026-06-01"), estado: "pagada" }, hoy)).toBe("pagada");
  });

  it("una cuota sin pagar cuya fecha ya pasó está vencida", () => {
    expect(estadoCuota({ fechaVencimiento: new Date("2026-07-01"), estado: "pendiente" }, hoy)).toBe("vencida");
  });

  it("una cuota que vence dentro de una semana está próxima", () => {
    expect(estadoCuota({ fechaVencimiento: new Date("2026-07-08"), estado: "pendiente" }, hoy)).toBe("proxima");
  });

  it("una cuota que vence en más de una semana sigue pendiente", () => {
    expect(estadoCuota({ fechaVencimiento: new Date("2026-08-15"), estado: "pendiente" }, hoy)).toBe("pendiente");
  });
});
