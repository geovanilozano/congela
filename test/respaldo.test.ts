import { describe, it, expect } from "vitest";
import { revivirFechas, ORDEN_RESTAURACION } from "../src/lib/respaldo";

describe("revivirFechas", () => {
  it("convierte los campos de fecha (texto ISO) en objetos Date", () => {
    const fila = revivirFechas({ id: 1, fecha: "2026-07-13T10:00:00.000Z", totalCents: 5000 });
    expect(fila.fecha).toBeInstanceOf(Date);
    expect((fila.fecha as Date).toISOString()).toBe("2026-07-13T10:00:00.000Z");
  });

  it("deja los campos que no son fecha tal cual", () => {
    const fila = revivirFechas({ nombre: "Bolsas", stock: 30 });
    expect(fila.nombre).toBe("Bolsas");
    expect(fila.stock).toBe(30);
  });

  it("respeta los campos de fecha en null", () => {
    const fila = revivirFechas({ fechaRealizada: null, fechaCompra: null });
    expect(fila.fechaRealizada).toBeNull();
    expect(fila.fechaCompra).toBeNull();
  });

  it("convierte todos los campos de fecha del esquema", () => {
    const fila = revivirFechas({
      createdAt: "2026-01-01T00:00:00.000Z",
      fechaVencimiento: "2026-02-01T00:00:00.000Z",
      periodoInicio: "2026-03-01T00:00:00.000Z",
    });
    expect(fila.createdAt).toBeInstanceOf(Date);
    expect(fila.fechaVencimiento).toBeInstanceOf(Date);
    expect(fila.periodoInicio).toBeInstanceOf(Date);
  });
});

describe("ORDEN_RESTAURACION", () => {
  it("los padres van antes que los hijos (respeta llaves foráneas)", () => {
    const claves = ORDEN_RESTAURACION.map((t) => t.clave);
    // reglaReparto depende de fondo
    expect(claves.indexOf("fondo")).toBeLessThan(claves.indexOf("reglaReparto"));
    // venta depende de cliente y cierreCaja
    expect(claves.indexOf("cliente")).toBeLessThan(claves.indexOf("venta"));
    expect(claves.indexOf("cierreCaja")).toBeLessThan(claves.indexOf("venta"));
    // ventaItem depende de venta
    expect(claves.indexOf("venta")).toBeLessThan(claves.indexOf("ventaItem"));
    // cuotaAmortizacion depende de credito
    expect(claves.indexOf("credito")).toBeLessThan(claves.indexOf("cuotaAmortizacion"));
    // movimientoInventario depende de insumoInventario
    expect(claves.indexOf("insumoInventario")).toBeLessThan(claves.indexOf("movimientoInventario"));
    // medidorCliente depende de cliente; liquidacionMedidor depende de medidorCliente
    expect(claves.indexOf("cliente")).toBeLessThan(claves.indexOf("medidorCliente"));
    expect(claves.indexOf("medidorCliente")).toBeLessThan(claves.indexOf("liquidacionMedidor"));
    // compraGasto depende de sus orígenes espejo (pagoNomina/reciboServicio/mantenimiento)
    expect(claves.indexOf("pagoNomina")).toBeLessThan(claves.indexOf("compraGasto"));
    expect(claves.indexOf("reciboServicio")).toBeLessThan(claves.indexOf("compraGasto"));
    expect(claves.indexOf("mantenimiento")).toBeLessThan(claves.indexOf("compraGasto"));
    // movimientoFondo depende de compraGasto (FK gastoId del débito)
    expect(claves.indexOf("compraGasto")).toBeLessThan(claves.indexOf("movimientoFondo"));
  });

  it("incluye las 26 tablas del respaldo (con sub-medición)", () => {
    expect(ORDEN_RESTAURACION.length).toBe(26);
    const claves = ORDEN_RESTAURACION.map((t) => t.clave);
    expect(claves).toContain("medidorCliente");
    expect(claves).toContain("liquidacionMedidor");
  });
});
