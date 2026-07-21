import { describe, it, expect } from "vitest";
import { resumenClientes, resumenClientesAgg } from "../src/lib/clientes";

const clientes = [
  { id: 1, nombre: "Tienda Marta", telefono: "300" },
  { id: 2, nombre: "Restaurante Sol", telefono: null },
  { id: 3, nombre: "Sin compras", telefono: null },
];

const ventas = [
  { clienteId: 1, totalCents: 100_000, formaPago: "contado", pagada: true },
  { clienteId: 1, totalCents: 50_000, formaPago: "credito", pagada: false }, // Marta debe 50.000
  { clienteId: 1, totalCents: 20_000, formaPago: "credito", pagada: true }, // ya pagada
  { clienteId: 2, totalCents: 200_000, formaPago: "credito", pagada: false }, // Sol debe 200.000
];

describe("resumenClientes", () => {
  it("calcula total comprado y por cobrar de cada cliente", () => {
    const r = resumenClientes(clientes, ventas);
    const marta = r.find((c) => c.id === 1)!;
    expect(marta.totalCompradoCents).toBe(170_000); // 100.000 + 50.000 + 20.000
    expect(marta.porCobrarCents).toBe(50_000); // solo el crédito no pagado
  });

  it("una venta a crédito pagada no cuenta como por cobrar", () => {
    const r = resumenClientes(clientes, ventas);
    expect(r.find((c) => c.id === 1)!.porCobrarCents).toBe(50_000);
  });

  it("ordena a quien más debe primero", () => {
    const r = resumenClientes(clientes, ventas);
    expect(r.map((c) => c.id)).toEqual([2, 1, 3]); // Sol (200k), Marta (50k), Sin compras (0)
  });

  it("un cliente sin compras aparece en cero", () => {
    const r = resumenClientes(clientes, ventas);
    const sin = r.find((c) => c.id === 3)!;
    expect(sin.totalCompradoCents).toBe(0);
    expect(sin.porCobrarCents).toBe(0);
  });

  it("el total por cobrar del negocio es la suma de todos", () => {
    const r = resumenClientes(clientes, ventas);
    expect(r.reduce((a, c) => a + c.porCobrarCents, 0)).toBe(250_000);
  });
});

describe("resumenClientesAgg (desde agregados de la BD)", () => {
  // Total comprado por cliente = groupBy _sum sobre TODAS las ventas.
  const comprasPorCliente = [
    { clienteId: 1, totalCents: 170_000 }, // Marta: 100k + 50k + 20k
    { clienteId: 2, totalCents: 200_000 }, // Sol: 200k
    { clienteId: null, totalCents: 9_999 }, // venta de mostrador (sin cliente) -> se ignora
  ];
  // Solo las ventas a crédito SIN pagar (lo que se lista y totaliza).
  const pendientes = [
    { clienteId: 1, totalCents: 50_000 },
    { clienteId: 2, totalCents: 200_000 },
  ];

  it("da el mismo resultado que resumenClientes pero desde agregados", () => {
    const r = resumenClientesAgg(clientes, comprasPorCliente, pendientes);
    const marta = r.find((c) => c.id === 1)!;
    expect(marta.totalCompradoCents).toBe(170_000);
    expect(marta.porCobrarCents).toBe(50_000);
  });

  it("ordena a quien más debe primero y deja en cero al que no tiene ventas", () => {
    const r = resumenClientesAgg(clientes, comprasPorCliente, pendientes);
    expect(r.map((c) => c.id)).toEqual([2, 1, 3]);
    const sin = r.find((c) => c.id === 3)!;
    expect(sin.totalCompradoCents).toBe(0);
    expect(sin.porCobrarCents).toBe(0);
  });

  it("el total por cobrar es la suma de los pendientes", () => {
    const r = resumenClientesAgg(clientes, comprasPorCliente, pendientes);
    expect(r.reduce((a, c) => a + c.porCobrarCents, 0)).toBe(250_000);
  });
});
