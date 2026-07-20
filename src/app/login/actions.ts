"use server";

import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { crearSesion, cerrarSesion } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";

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

// Hash señuelo (formato válido, clave imposible de adivinar). Si el usuario no existe,
// igual verificamos contra este para gastar el mismo tiempo de scrypt: así el tiempo de
// respuesta no delata qué nombres de usuario existen.
const HASH_SENUELO = hashPassword(randomBytes(16).toString("hex"));

export async function iniciarSesion(formData: FormData) {
  const usuario = String(formData.get("usuario") || "").trim().toLowerCase();
  const clave = String(formData.get("clave") || "");

  const u = await db.usuario.findUnique({ where: { usuario } });
  // Se verifica SIEMPRE (contra el señuelo si el usuario no existe) para no filtrar por tiempo.
  const claveOk = verifyPassword(clave, u?.passwordHash ?? HASH_SENUELO);
  if (!u || !u.activo || !claveOk) {
    redirect("/login?error=1");
  }
  await crearSesion({ userId: u.id, rol: u.rol, nombre: u.nombre });
  redirect("/");
}

export async function cerrarSesionAccion() {
  await cerrarSesion();
  redirect("/login");
}
