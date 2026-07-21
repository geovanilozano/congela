import { describe, it, expect } from "vitest";
import { repartir, repartirDetallado, ajustarReglaCredito, ReglaFondo } from "../src/lib/finance/fondos";

const reglas: ReglaFondo[] = [
  { fondo: "arriendo", tipo: "fijo", valorCents: 30_000, prioridad: 1, activo: true },
  { fondo: "credito", tipo: "fijo", valorCents: 20_000, prioridad: 2, activo: true },
  { fondo: "reserva", tipo: "porcentaje", valor: 0.1, prioridad: 3, activo: true },
  { fondo: "utilidad", tipo: "resto", prioridad: 99, activo: true },
];

describe("repartir", () => {
  it("aparta fijos, porcentaje y deja el resto en utilidad", () => {
    const r = repartir(100_000, reglas);
    expect(r.arriendo).toBe(30_000);
    expect(r.credito).toBe(20_000);
    expect(r.reserva).toBe(10_000); // 10% de 100.000
    expect(r.utilidad).toBe(40_000); // lo que sobra
  });
  it("la suma repartida es igual al ingreso", () => {
    const r = repartir(100_000, reglas);
    const suma = Object.values(r).reduce((a, b) => a + b, 0);
    expect(suma).toBe(100_000);
  });
  it("si un fondo fijo está inactivo (credito pagado), su dinero pasa al resto", () => {
    const reglasPagado = reglas.map((x) => (x.fondo === "credito" ? { ...x, activo: false } : x));
    const r = repartir(100_000, reglasPagado);
    expect(r.credito ?? 0).toBe(0);
    expect(r.utilidad).toBe(60_000); // los 20.000 del crédito ahora son utilidad
  });
  it("si el ingreso no alcanza, los fijos toman lo disponible por prioridad", () => {
    const r = repartir(25_000, reglas);
    expect(r.arriendo).toBe(25_000);
    expect(r.credito ?? 0).toBe(0);
    expect(r.utilidad ?? 0).toBe(0);
  });
});

describe("repartirDetallado — el dinero nunca se pierde", () => {
  it("avisa del sobrante cuando NO hay ningún fondo 'resto' activo", () => {
    // El dueño desactivó Utilidad: el sobrante no tiene dónde caer.
    const sinResto = reglas.map((x) => (x.tipo === "resto" ? { ...x, activo: false } : x));
    const { porFondo, sinAsignarCents } = repartirDetallado(100_000, sinResto);

    const repartido = Object.values(porFondo).reduce((a, b) => a + b, 0);

    // 30.000 + 20.000 + 10% = 60.000 repartidos. Los otros 40.000 NO pueden evaporarse.
    expect(repartido).toBe(60_000);
    expect(sinAsignarCents).toBe(40_000);
    expect(repartido + sinAsignarCents).toBe(100_000);
  });

  it("no queda sobrante cuando hay un fondo 'resto' activo", () => {
    const { porFondo, sinAsignarCents } = repartirDetallado(100_000, reglas);
    const repartido = Object.values(porFondo).reduce((a, b) => a + b, 0);

    expect(sinAsignarCents).toBe(0);
    expect(repartido).toBe(100_000);
  });
});

describe("ajustarReglaCredito (el fondo Crédito solo COMPLETA la próxima cuota)", () => {
  const nuevas = (): ReglaFondo[] => [
    { fondo: "arriendo", tipo: "fijo", valorCents: 30_000, prioridad: 1, activo: true },
    { fondo: "Crédito", tipo: "fijo", valorCents: 50_000, prioridad: 2, activo: true },
    { fondo: "utilidad", tipo: "resto", prioridad: 99, activo: true },
  ];

  it("descuenta lo ya apartado: solo aporta lo que falta para la cuota", () => {
    const r = nuevas();
    ajustarReglaCredito(r, 20_000); // ya hay 20k apartados de una cuota de 50k
    expect(r.find((x) => x.fondo === "Crédito")!.valorCents).toBe(30_000);
  });

  it("si ya se reunió la cuota, no aparta más (0) y el excedente fluye a utilidad", () => {
    const r = nuevas();
    ajustarReglaCredito(r, 60_000); // saldo supera el objetivo
    expect(r.find((x) => x.fondo === "Crédito")!.valorCents).toBe(0);
  });

  it("sin saldo apartado, el objetivo queda igual (la cuota entera)", () => {
    const r = nuevas();
    ajustarReglaCredito(r, 0);
    expect(r.find((x) => x.fondo === "Crédito")!.valorCents).toBe(50_000);
  });

  it("no toca fondos que no sean Crédito", () => {
    const r = nuevas();
    ajustarReglaCredito(r, 10_000);
    expect(r.find((x) => x.fondo === "arriendo")!.valorCents).toBe(30_000);
  });
});
