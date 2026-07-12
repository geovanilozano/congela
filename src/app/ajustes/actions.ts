"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Borra todos los datos de operación (deja la estructura de fondos).
// Útil para quitar los datos de demostración y empezar limpio.
export async function borrarDatosDemo() {
  // Orden hijo -> padre para respetar las llaves foráneas.
  await db.movimientoFondo.deleteMany();
  await db.movimientoInventario.deleteMany();
  await db.ventaItem.deleteMany();
  await db.pagoCredito.deleteMany();
  await db.cuotaAmortizacion.deleteMany();
  await db.asistencia.deleteMany();
  await db.pagoNomina.deleteMany();
  await db.venta.deleteMany();
  await db.cierreCaja.deleteMany();
  await db.cliente.deleteMany();
  await db.inversion.deleteMany();
  await db.credito.deleteMany();
  await db.produccion.deleteMany();
  await db.mantenimiento.deleteMany();
  await db.activo.deleteMany();
  await db.empleado.deleteMany();
  await db.insumoInventario.deleteMany();
  await db.compraGasto.deleteMany();
  await db.energiaGeneracion.deleteMany();
  await db.medidorLectura.deleteMany();
  await db.reciboServicio.deleteMany();
  await db.ajuste.deleteMany();

  // Reiniciar la cuota que aparta el fondo "Crédito".
  const fondoCredito = await db.fondo.findUnique({ where: { nombre: "Crédito" }, include: { regla: true } });
  if (fondoCredito?.regla) {
    await db.reglaReparto.update({ where: { id: fondoCredito.regla.id }, data: { valorCents: 0, activo: true } });
  }

  revalidatePath("/", "layout");
}
