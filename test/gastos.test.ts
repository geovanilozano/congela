import { describe, it, expect } from "vitest";
import { nombreFondoDeCategoria } from "../src/lib/finance/gastos";

describe("nombreFondoDeCategoria", () => {
  it("mapea la categoría a su bolsillo homónimo (con mayúscula/tilde)", () => {
    expect(nombreFondoDeCategoria("arriendo")).toBe("Arriendo");
    expect(nombreFondoDeCategoria("nomina")).toBe("Nómina");
    expect(nombreFondoDeCategoria("servicios")).toBe("Servicios");
    expect(nombreFondoDeCategoria("mantenimiento")).toBe("Mantenimiento");
    expect(nombreFondoDeCategoria("bolsas")).toBe("Bolsas");
  });

  it("las categorías sin bolsillo propio caen en Operación", () => {
    expect(nombreFondoDeCategoria("otro")).toBe("Operación");
    expect(nombreFondoDeCategoria("cualquier-cosa-rara")).toBe("Operación");
    expect(nombreFondoDeCategoria("")).toBe("Operación");
  });

  it("nunca apunta a un bolsillo automático (Crédito / Energía revendida)", () => {
    // Ninguna categoría debe resolver a un fondo automático.
    for (const c of ["arriendo", "nomina", "servicios", "mantenimiento", "bolsas", "transporte", "reparaciones", "impuestos", "otro"]) {
      const n = nombreFondoDeCategoria(c);
      expect(n).not.toBe("Crédito");
      expect(n).not.toBe("Energía revendida");
    }
  });
});
