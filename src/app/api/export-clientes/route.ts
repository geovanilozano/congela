import { db } from "@/lib/db";
import { fromCents } from "@/lib/finance/money";
import { getSesion } from "@/lib/auth/session";
import { resumenClientes } from "@/lib/clientes";

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

export async function GET() {
  const sesion = await getSesion();
  if (!sesion) return new Response("Necesitas iniciar sesión.", { status: 401 });

  const [clientes, ventas] = await Promise.all([
    db.cliente.findMany({ orderBy: { nombre: "asc" } }),
    db.venta.findMany({
      select: { clienteId: true, totalCents: true, formaPago: true, pagada: true },
    }),
  ]);

  const resumen = resumenClientes(clientes, ventas);
  // Datos completos por cliente (cédula y correo) para llenar las columnas.
  const porId = new Map(clientes.map((c) => [c.id, c]));

  const rows: (string | number)[][] = [
    ["Nombre", "Teléfono", "Cédula", "Correo", "Total comprado", "Saldo pendiente"],
  ];
  for (const c of resumen) {
    const raw = porId.get(c.id);
    rows.push([
      c.nombre,
      raw?.telefono ?? "",
      raw?.cedula ?? "",
      raw?.correo ?? "",
      fromCents(c.totalCompradoCents),
      fromCents(c.porCobrarCents),
    ]);
  }

  // BOM para que Excel reconozca los acentos (UTF-8).
  const csv = "﻿" + toCsv(rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="congela-clientes.csv"`,
    },
  });
}
