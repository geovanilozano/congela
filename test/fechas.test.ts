import { describe, it, expect } from "vitest";
import { rangoFechas, fechaLocal, fechaParaInput } from "../src/lib/fechas";

// Las fechas que escribe el usuario ("2026-07-13") deben entenderse en la hora
// LOCAL del negocio, no en UTC. Si se interpretan en UTC, en Colombia (UTC-5)
// se corren un día hacia atrás: se guardan y se filtran mal.

describe("fechaLocal", () => {
  it("interpreta 'AAAA-MM-DD' como ese mismo día en hora local", () => {
    const d = fechaLocal("2026-07-13")!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // julio (0-indexado)
    expect(d.getDate()).toBe(13); // el día 13, NO el 12
  });

  it("devuelve null cuando no hay fecha", () => {
    expect(fechaLocal("")).toBeNull();
    expect(fechaLocal(null)).toBeNull();
  });
});

describe("fechaParaInput", () => {
  it("una venta de las 8pm sigue siendo del MISMO día", () => {
    // Con toISOString(), en Colombia esto se convertía en el día siguiente:
    // el CSV la exportaba mal y el formulario de edición la corría un día.
    const venta = new Date(2026, 6, 13, 20, 0, 0); // 13 de julio, 8pm local
    expect(fechaParaInput(venta)).toBe("2026-07-13");
  });

  it("una fecha de madrugada tampoco se corre", () => {
    expect(fechaParaInput(new Date(2026, 0, 1, 0, 30, 0))).toBe("2026-01-01");
  });

  it("devuelve cadena vacía si no hay fecha", () => {
    expect(fechaParaInput(null)).toBe("");
    expect(fechaParaInput(undefined)).toBe("");
  });
});

describe("rangoFechas", () => {
  it("incluye una venta hecha ese mismo día por la mañana", () => {
    const r = rangoFechas({ desde: "2026-07-13", hasta: "2026-07-13" })!;
    // 10:00 am hora local del 13 de julio
    const venta = new Date(2026, 6, 13, 10, 0, 0);
    expect(venta >= r.gte!).toBe(true);
    expect(venta <= r.lte!).toBe(true);
  });

  it("NO incluye lo del día anterior por la noche", () => {
    const r = rangoFechas({ desde: "2026-07-13", hasta: "2026-07-13" })!;
    const ayer = new Date(2026, 6, 12, 20, 0, 0); // 12 de julio, 8pm
    expect(ayer >= r.gte!).toBe(false);
  });

  it("incluye hasta el último instante del día 'hasta'", () => {
    const r = rangoFechas({ desde: "2026-07-13", hasta: "2026-07-13" })!;
    const casiMedianoche = new Date(2026, 6, 13, 23, 59, 59);
    expect(casiMedianoche <= r.lte!).toBe(true);
  });

  it("no filtra nada si no se pasan fechas", () => {
    expect(rangoFechas({})).toBeUndefined();
    expect(rangoFechas(undefined)).toBeUndefined();
  });
});
