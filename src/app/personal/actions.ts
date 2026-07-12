"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { revalidatePath } from "next/cache";

export async function crearEmpleado(formData: FormData) {
  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) return;
  await db.empleado.create({
    data: {
      nombre,
      cargo: String(formData.get("cargo") || "") || null,
      telefono: String(formData.get("telefono") || "") || null,
      salarioCents: toCents(Number(formData.get("salarioPesos")) || 0),
      fechaIngreso: formData.get("fechaIngreso") ? new Date(String(formData.get("fechaIngreso"))) : null,
    },
  });
  revalidatePath("/personal");
}

export async function actualizarEmpleado(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) return;
  await db.empleado.update({
    where: { id },
    data: {
      nombre,
      cargo: String(formData.get("cargo") || "") || null,
      telefono: String(formData.get("telefono") || "") || null,
      salarioCents: toCents(Number(formData.get("salarioPesos")) || 0),
      fechaIngreso: formData.get("fechaIngreso") ? new Date(String(formData.get("fechaIngreso"))) : null,
    },
  });
  revalidatePath("/personal");
}

export async function registrarAsistencia(formData: FormData) {
  const empleadoId = Number(formData.get("empleadoId"));
  await db.asistencia.create({
    data: {
      empleadoId,
      fecha: formData.get("fecha") ? new Date(String(formData.get("fecha"))) : new Date(),
      turno: String(formData.get("turno") || "") || null,
      estado: String(formData.get("estado") || "presente"),
    },
  });
  revalidatePath("/personal");
}

export async function registrarPago(formData: FormData) {
  const empleadoId = Number(formData.get("empleadoId"));
  const valorPesos = Number(formData.get("valorPesos")) || 0;
  if (valorPesos <= 0) return;
  await db.pagoNomina.create({
    data: {
      empleadoId,
      valorCents: toCents(valorPesos),
      concepto: String(formData.get("concepto") || "Salario"),
    },
  });
  revalidatePath("/personal");
}

export async function eliminarEmpleado(formData: FormData) {
  await db.empleado.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/personal");
}
