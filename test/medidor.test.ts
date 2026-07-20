import { describe, it, expect } from "vitest";
import { liquidarMedidor } from "../src/lib/finance/medidor";

// Parámetros por defecto de una liquidación (se sobreescriben en cada caso).
const base = {
  factor: 1,
  subsidioPct: 0,
  subsistenciaKwh: 173,
  consumoTotalKwh: 0, // 0 = este medidor es el único del recibo
  alumbradoPct: 6,
  aseoTotalCents: 0,
  aseoPct: 0,
};

describe("liquidarMedidor", () => {
  it("factura ESSA de 49 kWh (todo dentro de subsistencia, subsidio 50%, CU 846,46)", () => {
    const r = liquidarMedidor({
      ...base,
      lecturaAnterior: 19943,
      lecturaActual: 19992,
      tarifaCuCents: 84646, // 846,46 $/kWh
      subsidioPct: 50,
      alumbradoPct: 6,
    });
    expect(r.consumoKwh).toBe(49);
    expect(r.energiaCents).toBe(49 * 84646); // 4.147.654 ≈ $41.477 (factura)
    // 49 kWh < 173 -> se subsidia todo: 50% de la energía. Factura: $20.786 (nuestra base ≈ $20.738).
    expect(r.subsidioCents).toBe(Math.round(49 * 84646 * 0.5));
    // Alumbrado 6% de la energía = $2.489 en la factura.
    expect(r.alumbradoClienteCents).toBe(Math.round(49 * 84646 * 0.06));
  });

  it("factura ESSA de 510 kWh (subsidio solo sobre 173 kWh, 47%, CU 824,03)", () => {
    const r = liquidarMedidor({
      ...base,
      lecturaAnterior: 27985,
      lecturaActual: 28495,
      tarifaCuCents: 82403,
      subsidioPct: 47,
      alumbradoPct: 6,
    });
    expect(r.consumoKwh).toBe(510);
    expect(r.energiaCents).toBe(510 * 82403); // $420.255
    // Solo se subsidian 173 kWh (el tope), no los 510.
    expect(r.subsidioCents).toBe(Math.round(173 * 82403 * 0.47));
    // Alumbrado 6% = $25.215 en la factura.
    expect(r.alumbradoClienteCents).toBe(2_521_532); // ≈ $25.215
  });

  it("reparte el subsidio del recibo entre varios medidores (proporcional al consumo)", () => {
    // Recibo total 605 kWh, subsidio 49%, CU 861,49 -> subsidio del recibo = 173 kWh × CU × 49%.
    const cu = 86149;
    const subsidioRecibo = Math.round(173 * cu * 0.49);

    // Persona A: 400 kWh de los 605 del recibo.
    const a = liquidarMedidor({ ...base, lecturaAnterior: 0, lecturaActual: 400, tarifaCuCents: cu, subsidioPct: 49, consumoTotalKwh: 605 });
    // Persona B: 205 kWh de los 605 del recibo.
    const b = liquidarMedidor({ ...base, lecturaAnterior: 0, lecturaActual: 205, tarifaCuCents: cu, subsidioPct: 49, consumoTotalKwh: 605 });

    expect(a.subsidioCents).toBe(Math.round(subsidioRecibo * (400 / 605)));
    expect(b.subsidioCents).toBe(Math.round(subsidioRecibo * (205 / 605)));
    // La suma de los subsidios repartidos ≈ el subsidio del recibo (± redondeo de 1 centavo).
    expect(Math.abs(a.subsidioCents + b.subsidioCents - subsidioRecibo)).toBeLessThanOrEqual(1);
  });

  it("con un solo medidor (consumoTotalKwh=0) el subsidio se aplica completo a su consumo", () => {
    const solo = liquidarMedidor({ ...base, lecturaAnterior: 0, lecturaActual: 100, tarifaCuCents: 100_000, subsidioPct: 50, consumoTotalKwh: 0 });
    expect(solo.subsidioCents).toBe(Math.round(100 * 100_000 * 0.5)); // 100<173 -> todo subsidiado
  });

  it("el subsidio se limita al consumo de subsistencia", () => {
    const bajo = liquidarMedidor({ ...base, lecturaAnterior: 0, lecturaActual: 100, tarifaCuCents: 100_000, subsidioPct: 50, subsistenciaKwh: 173 });
    expect(bajo.subsidioCents).toBe(Math.round(100 * 100_000 * 0.5)); // 100 < 173 -> subsidia 100

    const alto = liquidarMedidor({ ...base, lecturaAnterior: 0, lecturaActual: 300, tarifaCuCents: 100_000, subsidioPct: 50, subsistenciaKwh: 173 });
    expect(alto.subsidioCents).toBe(Math.round(173 * 100_000 * 0.5)); // 300 > 173 -> subsidia solo 173
  });

  it("respeta el factor de multiplicación del medidor", () => {
    const r = liquidarMedidor({ ...base, lecturaAnterior: 100, lecturaActual: 150, factor: 10, tarifaCuCents: 80_000 });
    expect(r.consumoKwh).toBe(500); // (150-100) × 10
  });

  it("suma el aseo como % de un cargo fijo", () => {
    const r = liquidarMedidor({ ...base, lecturaAnterior: 0, lecturaActual: 10, tarifaCuCents: 100_000, aseoTotalCents: 3_000_000, aseoPct: 50 });
    expect(r.aseoClienteCents).toBe(1_500_000);
  });

  it("una lectura menor que la anterior no genera consumo ni cobro negativo", () => {
    const r = liquidarMedidor({ ...base, lecturaAnterior: 100, lecturaActual: 50, tarifaCuCents: 80_000, subsidioPct: 50 });
    expect(r.consumoKwh).toBe(0);
    expect(r.totalCents).toBe(0);
  });

  it("un subsidio del 100% no genera un total negativo", () => {
    const r = liquidarMedidor({ ...base, lecturaAnterior: 0, lecturaActual: 10, tarifaCuCents: 80_000, subsidioPct: 100, alumbradoPct: 0 });
    expect(r.totalCents).toBe(0); // energía $8.000 − subsidio $8.000 = 0
  });
});
