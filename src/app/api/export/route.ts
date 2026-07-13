import { db } from "@/lib/db";
import { fromCents } from "@/lib/finance/money";
import { getSesion } from "@/lib/auth/session";
import { fechaParaInput as fecha } from "@/lib/fechas";
import { CLAVES_SECRETAS } from "@/lib/ajustes";

export const dynamic = "force-dynamic";

/**
 * Excel trata como fórmula cualquier celda de TEXTO que empiece por = + - o @: al abrir
 * el archivo la ejecutaría. Se le antepone una comilla para que la lea como texto.
 * Los números se dejan intactos (si no, un valor negativo dejaría de sumar en Excel).
 */
function celdaSegura(valor: string | number): string {
  if (typeof valor === "number") return `"${valor}"`;
  const peligrosa = /^[=+\-@\t\r]/.test(valor);
  return `"${(peligrosa ? `'${valor}` : valor).replace(/"/g, '""')}"`;
}

function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(celdaSegura).join(",")).join("\r\n");
}

export async function GET(request: Request) {
  const sesion = await getSesion();
  if (!sesion) return new Response("Necesitas iniciar sesión.", { status: 401 });

  const tipo = new URL(request.url).searchParams.get("tipo") ?? "ventas";

  // El respaldo se lleva TODA la base de datos (incluidos sueldos y usuarios): solo el dueño.
  if (tipo === "respaldo" && sesion.rol !== "dueno") {
    return new Response("Solo el dueño puede descargar el respaldo completo.", { status: 403 });
  }

  let rows: (string | number)[][] = [];
  const nombre = tipo;

  if (tipo === "ventas") {
    const ventas = await db.venta.findMany({ include: { cliente: true, items: true }, orderBy: { fecha: "asc" } });
    rows = [["Fecha", "Cliente", "Producto", "Forma de pago", "Total"]];
    for (const v of ventas) {
      rows.push([
        fecha(v.fecha),
        v.cliente?.nombre ?? "",
        v.items.map((i) => `${i.cantidad}x ${i.descripcion}`).join(" | "),
        v.formaPago,
        fromCents(v.totalCents),
      ]);
    }
  } else if (tipo === "gastos") {
    const gastos = await db.compraGasto.findMany({ orderBy: { fecha: "asc" } });
    rows = [["Fecha", "Categoria", "Descripcion", "Proveedor", "Valor"]];
    for (const g of gastos) {
      rows.push([fecha(g.fecha), g.categoria, g.descripcion, g.proveedor ?? "", fromCents(g.valorCents)]);
    }
  } else if (tipo === "respaldo") {
    // Respaldo completo de toda la base en JSON.
    const [
      inversion, credito, cuotaAmortizacion, pagoCredito, fondo, reglaReparto, movimientoFondo,
      cliente, venta, ventaItem, cierreCaja, compraGasto, insumoInventario, movimientoInventario,
      produccion, activo, empleado, asistencia, pagoNomina, mantenimiento,
      energiaGeneracion, medidorLectura, reciboServicio, ajusteTodos,
    ] = await Promise.all([
      db.inversion.findMany(), db.credito.findMany(), db.cuotaAmortizacion.findMany(),
      db.pagoCredito.findMany(), db.fondo.findMany(), db.reglaReparto.findMany(),
      db.movimientoFondo.findMany(), db.cliente.findMany(), db.venta.findMany(),
      db.ventaItem.findMany(), db.cierreCaja.findMany(), db.compraGasto.findMany(),
      db.insumoInventario.findMany(), db.movimientoInventario.findMany(), db.produccion.findMany(),
      db.activo.findMany(), db.empleado.findMany(), db.asistencia.findMany(),
      db.pagoNomina.findMany(), db.mantenimiento.findMany(), db.energiaGeneracion.findMany(),
      db.medidorLectura.findMany(), db.reciboServicio.findMany(), db.ajuste.findMany(),
    ]);
    // El respaldo NO debe llevar secretos (clave de Growatt, API key), aunque estén
    // cifrados: un archivo de respaldo se comparte y se guarda en cualquier lado.
    const secretas: string[] = [...CLAVES_SECRETAS];
    const ajuste = ajusteTodos.filter((a) => !secretas.includes(a.clave));
    const respaldo = {
      inversion, credito, cuotaAmortizacion, pagoCredito, fondo, reglaReparto, movimientoFondo,
      cliente, venta, ventaItem, cierreCaja, compraGasto, insumoInventario, movimientoInventario,
      produccion, activo, empleado, asistencia, pagoNomina, mantenimiento,
      energiaGeneracion, medidorLectura, reciboServicio, ajuste,
    };
    return new Response(JSON.stringify(respaldo, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="congela-respaldo.json"`,
      },
    });
  } else {
    return new Response("Tipo no válido. Usa ?tipo=ventas, ?tipo=gastos o ?tipo=respaldo", { status: 400 });
  }

  // BOM para que Excel reconozca los acentos (UTF-8).
  const csv = "﻿" + toCsv(rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="congela-${nombre}.csv"`,
    },
  });
}
