// Bitácora de acciones sensibles (quién hizo qué y cuándo).
//
// Se llama DESPUÉS de que la operación tuvo éxito, y nunca lanza: si por lo que sea no
// se puede escribir el registro, la operación del usuario no debe romperse por eso. El
// nombre y el rol se copian al registro para que siga siendo legible aunque el usuario
// cambie o se elimine.
import { db } from "@/lib/db";
import { getSesion } from "@/lib/auth/session";
import { formatMoney } from "@/lib/finance/money";

export type AccionAuditada = "crear" | "actualizar" | "eliminar" | "cerrar" | "anular" | "restaurar";

export async function auditar(datos: {
  accion: AccionAuditada;
  entidad: string;
  entidadId?: number | null;
  detalle?: string;
}): Promise<void> {
  try {
    const sesion = await getSesion();
    await db.registroAuditoria.create({
      data: {
        usuarioId: sesion?.userId ?? null,
        usuarioNombre: sesion?.nombre ?? "desconocido",
        rol: sesion?.rol ?? null,
        accion: datos.accion,
        entidad: datos.entidad,
        entidadId: datos.entidadId ?? null,
        detalle: datos.detalle ?? null,
      },
    });
  } catch {
    // La bitácora nunca debe tumbar la acción del usuario.
  }
}

/** Ayuda a describir montos de forma uniforme en el detalle del registro. */
export function conMonto(texto: string, cents: number): string {
  return `${texto} · ${formatMoney(cents)}`;
}
