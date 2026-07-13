import { describe, it, expect, vi, afterEach } from "vitest";
import { firmar, verificar, DURACION_SESION_SEG } from "../src/lib/auth/token";

const SESION = { userId: 1, rol: "dueno", nombre: "Geovani" };

afterEach(() => {
  vi.useRealTimers();
});

describe("token de sesión", () => {
  it("acepta un token recién firmado", async () => {
    const token = await firmar(SESION);
    expect(await verificar(token)).toEqual(SESION);
  });

  it("rechaza un token vencido", async () => {
    const token = await firmar(SESION);

    // Adelantamos el reloj un día más allá del vencimiento.
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + (DURACION_SESION_SEG + 86400) * 1000);

    expect(await verificar(token)).toBeNull();
  });

  it("rechaza un token con la firma alterada", async () => {
    const token = await firmar(SESION);
    const [datos] = token.split(".");
    expect(await verificar(`${datos}.firmaInventada`)).toBeNull();
  });

  it("rechaza un token con los datos manipulados (subirse el rol)", async () => {
    const token = await firmar({ ...SESION, rol: "operario" });
    const [, firma] = token.split(".");

    // Un operario intenta hacerse pasar por dueño reescribiendo el contenido.
    const falso = Buffer.from(JSON.stringify({ ...SESION, rol: "dueno", exp: 9e9 }))
      .toString("base64url");

    expect(await verificar(`${falso}.${firma}`)).toBeNull();
  });

  it("rechaza tokens antiguos sin fecha de vencimiento", async () => {
    // Formato de la versión anterior: sin `exp`. No debe seguir sirviendo.
    const viejo = Buffer.from(JSON.stringify(SESION)).toString("base64url");
    expect(await verificar(`${viejo}.loQueSea`)).toBeNull();
  });

  it("no acepta un token vacío", async () => {
    expect(await verificar(undefined)).toBeNull();
    expect(await verificar("")).toBeNull();
  });
});
