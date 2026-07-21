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

/**
 * Igual que `resumenClientes` pero a partir de AGREGADOS ya calculados por la base de datos,
 * en vez de traer toda la tabla de ventas a memoria: `comprasPorCliente` = total comprado por
 * cliente (groupBy _sum), `pendientes` = las ventas a crédito aún sin pagar (para el "por
 * cobrar"). Mismo orden de salida (más deuda primero). Evita el over-fetch de /clientes.
 */
export function resumenClientesAgg(
  clientes: ClienteBase[],
  comprasPorCliente: { clienteId: number | null; totalCents: number }[],
  pendientes: { clienteId: number | null; totalCents: number }[],
): ClienteResumen[] {
  const totalDe = new Map<number, number>();
  for (const g of comprasPorCliente) if (g.clienteId != null) totalDe.set(g.clienteId, g.totalCents);

  const porCobrarDe = new Map<number, number>();
  for (const v of pendientes) {
    if (v.clienteId == null) continue;
    porCobrarDe.set(v.clienteId, (porCobrarDe.get(v.clienteId) ?? 0) + v.totalCents);
  }

  return clientes
    .map((c) => ({ ...c, totalCompradoCents: totalDe.get(c.id) ?? 0, porCobrarCents: porCobrarDe.get(c.id) ?? 0 }))
    .sort((a, b) => b.porCobrarCents - a.porCobrarCents || b.totalCompradoCents - a.totalCompradoCents);
}
