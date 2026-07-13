import { describe, it, expect } from "vitest";
import { cifrar, descifrar } from "../src/lib/crypto";

describe("cifrado de secretos", () => {
  it("lo cifrado se puede descifrar y devuelve el original", () => {
    const secreto = "mi-clave-de-growatt-123";
    const cifrado = cifrar(secreto);
    expect(cifrado).not.toBe(secreto); // no queda legible
    expect(descifrar(cifrado)).toBe(secreto);
  });

  it("el mismo texto cifrado dos veces da resultados distintos (IV aleatorio)", () => {
    expect(cifrar("igual")).not.toBe(cifrar("igual"));
  });

  it("descifrar un texto plano antiguo (sin cifrar) lo devuelve tal cual", () => {
    // Migración transparente: las claves guardadas antes del cifrado siguen sirviendo.
    expect(descifrar("clave-vieja-en-texto-plano")).toBe("clave-vieja-en-texto-plano");
  });

  it("un texto cifrado manipulado no se puede descifrar", () => {
    const cifrado = cifrar("secreto");
    const manipulado = cifrado.slice(0, -3) + "xyz";
    expect(() => descifrar(manipulado)).toThrow();
  });

  it("maneja cadenas vacías", () => {
    expect(descifrar(cifrar(""))).toBe("");
  });

  it("maneja acentos y símbolos", () => {
    const s = "clavé-con-ñ-y-símbolos-@#$%";
    expect(descifrar(cifrar(s))).toBe(s);
  });
});
