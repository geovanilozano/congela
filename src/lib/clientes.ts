// Cuentas por cobrar: cuánto ha comprado cada cliente y cuánto debe (fiado sin pagar).
// Puro: sin dependencias de base de datos ni UI.

export interface ClienteBase {
  id: number;
  nombre: string;
  telefono?: string | null;
}

export interface VentaCobro {
  clienteId: number | null;
  totalCents: number;
  formaPago: string; // "contado" | "credito"
  pagada: boolean;
}

export interface ClienteResumen extends ClienteBase {
  totalCompradoCents: number;
  porCobrarCents: number;
}

/**
 * Resume cada cliente: total comprado (todas sus ventas) y por cobrar (sus ventas a
 * crédito que aún no ha pagado). Ordena a quien más debe primero (y luego por quién ha
 * comprado más), para que la deuda salte a la vista.
 */
export function resumenClientes(clientes: ClienteBase[], ventas: VentaCobro[]): ClienteResumen[] {
  const porCliente = new Map<number, { total: number; porCobrar: number }>();
  const bucket = (id: number) => {
    let b = porCliente.get(id);
    if (!b) porCliente.set(id, (b = { total: 0, porCobrar: 0 }));
    return b;
  };

  for (const v of ventas) {
    if (v.clienteId == null) continue;
    const b = bucket(v.clienteId);
    b.total += v.totalCents;
    if (v.formaPago === "credito" && !v.pagada) b.porCobrar += v.totalCents;
  }

  return clientes
    .map((c) => {
      const b = porCliente.get(c.id) ?? { total: 0, porCobrar: 0 };
      return { ...c, totalCompradoCents: b.total, porCobrarCents: b.porCobrar };
    })
    .sort((a, b) => b.porCobrarCents - a.porCobrarCents || b.totalCompradoCents - a.totalCompradoCents);
}
