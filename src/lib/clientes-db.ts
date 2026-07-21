// Helper de servidor (usa la base de datos) para ligar por nombre a un cliente.
// Separado de `clientes.ts` (que es puro) para no arrastrar Prisma a componentes.
import { db } from "@/lib/db";

/**
 * Liga un nombre a un cliente existente o crea uno mínimo (solo el nombre). La coincidencia
 * NO distingue mayúsculas ni espacios de sobra: "juan", "Juan" y "Juan " son el mismo cliente
 * (si no, el fiado se parte entre duplicados y la deuda queda oculta). `tipo` se guarda solo
 * al crear (opcional; p. ej. la forma de pago de la venta que originó el cliente).
 */
export async function resolverClienteId(nombre: string, tipo?: string): Promise<number | null> {
  const limpio = nombre.trim();
  if (!limpio) return null;
  const existente = await db.cliente.findFirst({ where: { nombre: { equals: limpio, mode: "insensitive" } } });
  if (existente) return existente.id;
  return (await db.cliente.create({ data: { nombre: limpio, ...(tipo ? { tipo } : {}) } })).id;
}
