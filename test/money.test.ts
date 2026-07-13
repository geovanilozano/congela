import { describe, it, expect } from "vitest";
import { toCents, fromCents, round2, formatMiles, parseMiles } from "../src/lib/finance/money";

describe("money", () => {
  it("convierte pesos a centavos", () => {
    expect(toCents(1234.56)).toBe(123456);
  });
  it("convierte centavos a pesos", () => {
    expect(fromCents(123456)).toBe(1234.56);
  });
  it("redondea a 2 decimales", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
});

describe("formatMiles", () => {
  it("pone separador de miles a un número entero", () => {
    expect(formatMiles(1500000)).toBe("1.500.000");
  });
  it("acepta un texto con dígitos", () => {
    expect(formatMiles("1500000")).toBe("1.500.000");
  });
  it("ignora lo que no sea dígito", () => {
    expect(formatMiles("1.500.000")).toBe("1.500.000");
  });
  it("cadena vacía se queda vacía", () => {
    expect(formatMiles("")).toBe("");
  });
  it("un solo dígito no lleva separador", () => {
    expect(formatMiles("0")).toBe("0");
    expect(formatMiles(500)).toBe("500");
  });
});

describe("parseMiles", () => {
  it("quita los separadores y devuelve el número", () => {
    expect(parseMiles("1.500.000")).toBe(1500000);
  });
  it("cadena vacía es 0", () => {
    expect(parseMiles("")).toBe(0);
  });
  it("texto sin dígitos es 0", () => {
    expect(parseMiles("abc")).toBe(0);
  });
  it("es la inversa de formatMiles", () => {
    expect(parseMiles(formatMiles(1500000))).toBe(1500000);
  });
});
