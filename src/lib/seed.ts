import { db } from "@/lib/db";

// Fondos por defecto con sus reglas de reparto iniciales.
// El dueño luego ajusta montos y porcentajes en la pantalla de Fondos.
const FONDOS_DEFAULT = [
  { nombre: "Arriendo", tipo: "fijo", valorCents: 0, valor: null, prioridad: 1, activo: true },
  { nombre: "Crédito", tipo: "fijo", valorCents: 0, valor: null, prioridad: 2, activo: true },
  { nombre: "Operación", tipo: "porcentaje", valorCents: null, valor: 0.15, prioridad: 3, activo: true },
  { nombre: "Reserva", tipo: "porcentaje", valorCents: null, valor: 0.05, prioridad: 4, activo: true },
  { nombre: "Reinversión", tipo: "fijo", valorCents: 0, valor: null, prioridad: 5, activo: false },
  { nombre: "Utilidad", tipo: "resto", valorCents: null, valor: null, prioridad: 98, activo: true },
] as const;

/** Crea los fondos por defecto si aún no existen. Idempotente. */
export async function ensureFondos(): Promise<void> {
  const count = await db.fondo.count();
  if (count > 0) return;
  for (const f of FONDOS_DEFAULT) {
    await db.fondo.create({
      data: {
        nombre: f.nombre,
        regla: {
          create: {
            tipo: f.tipo,
            valorCents: f.valorCents,
            valor: f.valor,
            prioridad: f.prioridad,
            activo: f.activo,
          },
        },
      },
    });
  }
}
