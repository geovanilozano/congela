"use server";

import { db } from "@/lib/db";
import { toCents } from "@/lib/finance/money";
import { revalidatePath } from "next/cache";
import { fechaLocal, fechaLocalODefecto } from "@/lib/fechas";
import { exigirDueno } from "@/lib/auth/guard";

export async function crearEmpleado(formData: FormData) {
  await exigirDueno();
  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) return;
  await db.empleado.create({
    data: {
      nombre,
      cargo: String(formData.get("cargo") || "") || null,
      telefono: String(formData.get("telefono") || "") || null,
      salarioCents: toCents(Number(formData.get("salarioPesos")) || 0),
      fechaIngreso: fechaLocal(String(formData.get("fechaIngreso") ?? "")),
    },
  });
  revalidatePath("/personal");
}

export async function actualizarEmpleado(formData: FormData) {
  await exigirDueno();
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
      fechaIngreso: fechaLocal(String(formData.get("fechaIngreso") ?? "")),
    },
  });
  revalidatePath("/personal");
}

export async function registrarAsistencia(formData: FormData) {
  await exigirDueno();
  const empleadoId = Number(formData.get("empleadoId"));
  await db.asistencia.create({
    data: {
      empleadoId,
      fecha: fechaLocalODefecto(formData.get("fecha")),
      turno: String(formData.get("turno") || "") || null,
      estado: String(formData.get("estado") || "presente"),
    },
  });
  revalidatePath("/personal");
}

export async function registrarPago(formData: FormData) {
  await exigirDueno();
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
  await exigirDueno();
  await db.empleado.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/personal");
}
