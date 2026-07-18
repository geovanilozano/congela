"use server";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { setAjuste, setAjusteSeguro } from "@/lib/ajustes";
import { exigirDueno } from "@/lib/auth/guard";
import { ROLES } from "@/lib/auth/permisos";
import { restaurarRespaldo } from "@/lib/respaldo";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function guardarClaveOcr(formData: FormData) {
  await exigirDueno();
  const clave = String(formData.get("anthropicApiKey") || "").trim();
  if (clave) await setAjusteSeguro("anthropicApiKey", clave);
  revalidatePath("/ajustes");
}

// Datos del negocio que salen en la factura (encabezado). Todos opcionales.
export async function guardarDatosNegocio(formData: FormData) {
  await exigirDueno();
  const campos = ["negocioNombre", "negocioNit", "negocioDireccion", "negocioTelefono"] as const;
  for (const c of campos) {
    await setAjuste(c, String(formData.get(c) || "").trim());
  }
  revalidatePath("/ajustes");
}

export async function crearUsuario(formData: FormData) {
  await exigirDueno();
  const nombre = String(formData.get("nombre") || "").trim();
  const usuario = String(formData.get("usuario") || "").trim().toLowerCase();
  const clave = String(formData.get("clave") || "");
  const rol = String(formData.get("rol") || "operario");
  if (!nombre || !usuario || clave.length < 4) return;
  // El rol tiene que ser uno de los conocidos: un valor inválido dejaría al usuario sin
  // acceso a ninguna ruta (y con la cookie puesta, en un bucle de redirección).
  if (!ROLES.some((r) => r.valor === rol)) return;

  const existe = await db.usuario.findUnique({ where: { usuario } });
  if (existe) return; // usuario repetido: no hacer nada

  await db.usuario.create({ data: { nombre, usuario, passwordHash: hashPassword(clave), rol } });
  revalidatePath("/ajustes");
}

export async function eliminarUsuario(formData: FormData) {
  await exigirDueno();
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

// Restaura un respaldo (.json): reemplaza todos los datos actuales por los del archivo.
export async function restaurarRespaldoAccion(formData: FormData) {
  await exigirDueno();

  const archivo = formData.get("respaldo");
  if (!archivo || typeof archivo === "string" || !(archivo as File).size) {
    redirect("/ajustes?error=sinArchivo");
  }

  let datos: unknown;
  try {
    datos = JSON.parse(await (archivo as File).text());
  } catch {
    redirect("/ajustes?error=jsonInvalido");
  }

  const r = await restaurarRespaldo(datos);
  if (!r.ok) redirect("/ajustes?error=restauracion");

  revalidatePath("/", "layout");
  redirect(`/ajustes?restaurado=${r.totalFilas}`);
}

// Borra todos los datos de operación (deja la estructura de fondos).
// Útil para quitar los datos de demostración y empezar limpio.
export async function borrarDatosDemo() {
  await exigirDueno();

  // Todo dentro de una transacción: o se borra todo, o no se borra nada. Así un fallo
  // a mitad no deja la base con unas tablas vacías y otras no.
  await db.$transaction(async (tx) => {
    // Orden hijo -> padre para respetar las llaves foráneas.
    await tx.movimientoFondo.deleteMany();
    await tx.movimientoInventario.deleteMany();
    await tx.ventaItem.deleteMany();
    await tx.pagoCredito.deleteMany();
    await tx.cuotaAmortizacion.deleteMany();
    await tx.asistencia.deleteMany();
    await tx.pagoNomina.deleteMany();
    await tx.venta.deleteMany();
    await tx.cierreCaja.deleteMany();
    await tx.cliente.deleteMany();
    await tx.inversion.deleteMany();
    await tx.credito.deleteMany();
    await tx.produccion.deleteMany();
    await tx.mantenimiento.deleteMany();
    await tx.activo.deleteMany();
    await tx.empleado.deleteMany();
    await tx.insumoInventario.deleteMany();
    await tx.compraGasto.deleteMany();
    await tx.energiaGeneracion.deleteMany();
    await tx.medidorLectura.deleteMany();
    await tx.reciboServicio.deleteMany();
    await tx.ajuste.deleteMany();

    // Reiniciar la cuota que aparta el fondo "Crédito".
    const fondoCredito = await tx.fondo.findUnique({ where: { nombre: "Crédito" }, include: { regla: true } });
    if (fondoCredito?.regla) {
      await tx.reglaReparto.update({ where: { id: fondoCredito.regla.id }, data: { valorCents: 0, activo: true } });
    }
  });

  revalidatePath("/", "layout");
}
