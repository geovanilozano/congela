"use server";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { setAjuste } from "@/lib/ajustes";
import { revalidatePath } from "next/cache";

export async function guardarClaveOcr(formData: FormData) {
  const clave = String(formData.get("anthropicApiKey") || "").trim();
  if (clave) await setAjuste("anthropicApiKey", clave);
  revalidatePath("/ajustes");
}

export async function crearUsuario(formData: FormData) {
  const nombre = String(formData.get("nombre") || "").trim();
  const usuario = String(formData.get("usuario") || "").trim().toLowerCase();
  const clave = String(formData.get("clave") || "");
  const rol = String(formData.get("rol") || "operario");
  if (!nombre || !usuario || clave.length < 4) return;

  const existe = await db.usuario.findUnique({ where: { usuario } });
  if (existe) return; // usuario repetido: no hacer nada

  await db.usuario.create({ data: { nombre, usuario, passwordHash: hashPassword(clave), rol } });
  revalidatePath("/ajustes");
}

export async function eliminarUsuario(formData: FormData) {
  const id = Number(formData.get("id"));
  // No dejar la app sin ningún dueño.
  const u = await db.usuario.findUnique({ where: { id } });
  if (!u) return;
  if (u.rol === "dueno") {
    const duenos = await db.usuario.count({ where: { rol: "dueno" } });
    if (duenos <= 1) return;
  }
  await db.usuario.delete({ where: { id } });
  revalidatePath("/ajustes");
}

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
