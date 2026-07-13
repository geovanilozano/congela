import { describe, it, expect } from "vitest";
import { resumenClientes } from "../src/lib/clientes";

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
