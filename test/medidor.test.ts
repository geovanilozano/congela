import { describe, it, expect } from "vitest";
import { liquidarMedidor } from "../src/lib/finance/medidor";

describe("liquidarMedidor", () => {
  it("calcula el consumo y la energía como la factura de ESSA (510 kWh, CU 824,03)", () => {
    const r = liquidarMedidor({
      lecturaAnterior: 27985,
      lecturaActual: 28495,
      factor: 1,
      tarifaCuCents: 82403, // 824,03 $/kWh
      subsidioCents: 6_784_700, // -$67.847
      alumbradoTotalCents: 2_521_500, // $25.215
      alumbradoPct: 50,
      aseoTotalCents: 0,
      aseoPct: 0,
    });
    expect(r.consumoKwh).toBe(510);
    expect(r.energiaCents).toBe(510 * 82403); // 42.025.530 = $420.255,30
    expect(r.alumbradoClienteCents).toBe(1_260_750); // 50% de $25.215
    expect(r.aseoClienteCents).toBe(0);
    expect(r.totalCents).toBe(42_025_530 - 6_784_700 + 1_260_750); // 36.501.580 = $365.015,80
  });

  it("aplica el porcentaje de alumbrado y de aseo por separado", () => {
    const r = liquidarMedidor({
      lecturaAnterior: 0,
      lecturaActual: 100,
      factor: 1,
      tarifaCuCents: 100_000, // $1.000/kWh
      subsidioCents: 0,
      alumbradoTotalCents: 1_000_000, // $10.000
      alumbradoPct: 50,
      aseoTotalCents: 2_000_000, // $20.000
      aseoPct: 25,
    });
    expect(r.energiaCents).toBe(10_000_000);
    expect(r.alumbradoClienteCents).toBe(500_000);
    expect(r.aseoClienteCents).toBe(500_000);
    expect(r.totalCents).toBe(11_000_000);
  });

  it("respeta el factor de multiplicación del medidor", () => {
    const r = liquidarMedidor({
      lecturaAnterior: 100,
      lecturaActual: 150,
      factor: 10,
      tarifaCuCents: 80_000,
      subsidioCents: 0,
      alumbradoTotalCents: 0,
      alumbradoPct: 0,
      aseoTotalCents: 0,
      aseoPct: 0,
    });
    expect(r.consumoKwh).toBe(500); // (150-100) × 10
    expect(r.energiaCents).toBe(500 * 80_000);
  });

  it("una lectura menor que la anterior no genera consumo ni cobro negativo", () => {
    const r = liquidarMedidor({
      lecturaAnterior: 100,
      lecturaActual: 50,
      factor: 1,
      tarifaCuCents: 80_000,
      subsidioCents: 0,
      alumbradoTotalCents: 0,
      alumbradoPct: 0,
      aseoTotalCents: 0,
      aseoPct: 0,
    });
    expect(r.consumoKwh).toBe(0);
    expect(r.totalCents).toBe(0);
  });

  it("un subsidio mayor que el consumo no genera un total negativo", () => {
    const r = liquidarMedidor({
      lecturaAnterior: 0,
      lecturaActual: 10,
      factor: 1,
      tarifaCuCents: 80_000, // energía = $8.000
      subsidioCents: 9_999_999, // descuento gigante
      alumbradoTotalCents: 0,
      alumbradoPct: 0,
      aseoTotalCents: 0,
      aseoPct: 0,
    });
    expect(r.totalCents).toBe(0);
  });
});
