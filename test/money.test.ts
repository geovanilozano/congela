import { describe, it, expect } from "vitest";
import { toCents, fromCents, round2 } from "../src/lib/finance/money";

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
