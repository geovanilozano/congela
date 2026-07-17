"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirRol } from "@/lib/auth/guard";

// Texto opcional del formulario: limpio, o null si viene vacío (así no se guardan "").
function opcional(v: FormDataEntryValue | null): string | null {
  const s = String(v || "").trim();
  return s || null;
}

export async function crearCliente(formData: FormData) {
  await exigirRol("dueno", "cajero");
  const nombre = String(formData.get("nombre") || "").trim();
  // Solo el nombre es obligatorio; el resto es opcional.
  if (!nombre) redirect("/clientes?error=nombre");

  await db.cliente.create({
    data: {
      nombre,
      telefono: opcional(formData.get("telefono")),
      cedula: opcional(formData.get("cedula")),
      correo: opcional(formData.get("correo")),
    },
  });

  revalidatePath("/clientes");
  revalidatePath("/ventas"); // el datalist de la venta usa la lista de clientes
  redirect("/clientes?ok=1");
}

export async function actualizarCliente(formData: FormData) {
  await exigirRol("dueno", "cajero");
  const id = Number(formData.get("id"));
  const nombre = String(formData.get("nombre") || "").trim();
  if (!id || !nombre) redirect("/clientes?error=nombre");

  await db.cliente.update({
    where: { id },
    data: {
      nombre,
      telefono: opcional(formData.get("telefono")),
      cedula: opcional(formData.get("cedula")),
      correo: opcional(formData.get("correo")),
    },
  });

  revalidatePath("/clientes");
  revalidatePath("/ventas");
  redirect("/clientes?ok=1");
}
