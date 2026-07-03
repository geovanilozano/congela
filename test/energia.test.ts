import { describe, it, expect } from "vitest";
import { balanceEnergia } from "../src/lib/finance/energia";

describe("balanceEnergia", () => {
  it("cuando los paneles generan menos de lo que se consume, el resto viene de la red", () => {
    const r = balanceEnergia({ generacionKwh: 30, consumoKwh: 50, precioKwhCents: 80000 });
    expect(r.solarUsadaKwh).toBe(30);
    expect(r.redKwh).toBe(20);
    expect(r.excedenteKwh).toBe(0);
    expect(r.ahorroCents).toBe(30 * 80000);
    expect(r.costoRedCents).toBe(20 * 80000);
  });

  it("cuando los paneles generan de más, hay excedente y no se compra a la red", () => {
    const r = balanceEnergia({ generacionKwh: 70, consumoKwh: 50, precioKwhCents: 80000 });
    expect(r.solarUsadaKwh).toBe(50);
    expect(r.redKwh).toBe(0);
    expect(r.excedenteKwh).toBe(20);
    expect(r.ahorroCents).toBe(50 * 80000);
    expect(r.costoRedCents).toBe(0);
  });

  it("sin generación solar, todo el consumo se paga a la red y no hay ahorro", () => {
    const r = balanceEnergia({ generacionKwh: 0, consumoKwh: 40, precioKwhCents: 80000 });
    expect(r.ahorroCents).toBe(0);
    expect(r.redKwh).toBe(40);
    expect(r.costoRedCents).toBe(40 * 80000);
  });

  it("el porcentaje solar refleja cuánto del consumo cubrieron los paneles", () => {
    const r = balanceEnergia({ generacionKwh: 25, consumoKwh: 100, precioKwhCents: 80000 });
    expect(r.porcentajeSolar).toBe(25);
  });
});
