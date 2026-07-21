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

// Bolsillo especial de INGRESO (no participa del reparto del cierre): recibe lo que pagan
// los inquilinos por la energía revendida. Se crea sin regla, así el motor de reparto lo ignora.
export const FONDO_INGRESO_ENERGIA = "Energía revendida";

/** Devuelve el id del bolsillo "Energía revendida", creándolo si no existe. Idempotente. */
export async function ensureFondoEnergia(): Promise<number> {
  const existente = await db.fondo.findFirst({ where: { nombre: FONDO_INGRESO_ENERGIA }, select: { id: true } });
  if (existente) return existente.id;
  const creado = await db.fondo.create({ data: { nombre: FONDO_INGRESO_ENERGIA } });
  return creado.id;
}

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
