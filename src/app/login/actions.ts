"use server";

import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { crearSesion, cerrarSesion } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export async function registrarPrimerUsuario(formData: FormData) {
  // Solo permitido si aún no hay ningún usuario (crea el Dueño inicial).
  if ((await db.usuario.count()) > 0) redirect("/login");

  const nombre = String(formData.get("nombre") || "").trim();
  const usuario = String(formData.get("usuario") || "").trim().toLowerCase();
  const clave = String(formData.get("clave") || "");
  if (!nombre || !usuario || clave.length < 4) redirect("/login?error=datos");

  const u = await db.usuario.create({
    data: { nombre, usuario, passwordHash: hashPassword(clave), rol: "dueno" },
  });
  await crearSesion({ userId: u.id, rol: u.rol, nombre: u.nombre });
  redirect("/");
}

export async function iniciarSesion(formData: FormData) {
  const usuario = String(formData.get("usuario") || "").trim().toLowerCase();
  const clave = String(formData.get("clave") || "");

  const u = await db.usuario.findUnique({ where: { usuario } });
  if (!u || !u.activo || !verifyPassword(clave, u.passwordHash)) {
    redirect("/login?error=1");
  }
  await crearSesion({ userId: u.id, rol: u.rol, nombre: u.nombre });
  redirect("/");
}

export async function cerrarSesionAccion() {
  await cerrarSesion();
  redirect("/login");
}
