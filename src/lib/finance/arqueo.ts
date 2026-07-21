// Cálculo del EFECTIVO ESPERADO en la caja, para el arqueo.
//
// Esperado = Σ saldo de los bolsillos marcados como EFECTIVO − fiado ya repartido pero aún sin
// cobrar. Se resta el fiado porque el cierre reparte TODAS las ventas (incluido el fiado no
// cobrado) a los bolsillos, pero ese dinero todavía no está físicamente en el cajón; al cobrarlo
// no se mueve ningún fondo (el efectivo llega después). Por eso el arqueo se hace TRAS cerrar
// caja: en ese momento todo el fiado pendiente ya está repartido y las ventas de contado también.
import { db } from "@/lib/db";

export interface EsperadoCaja {
  esperadoCents: number;
  fondosCents: number;
  fiadoPendienteCents: number;
  ventasSinCerrarCents: number;
  desglose: { nombre: string; saldo: number }[];
}

export async function calcularEsperadoCaja(): Promise<EsperadoCaja> {
  const [fondosEfectivo, saldos, fiado, sinCerrar] = await Promise.all([
    db.fondo.findMany({ where: { esEfectivo: true }, select: { id: true, nombre: true } }),
    db.movimientoFondo.groupBy({ by: ["fondoId"], _sum: { montoCents: true } }),
    // Fiado ya cerrado (cierreId != null → ya entró a los fondos) pero aún sin cobrar.
    db.venta.aggregate({ where: { formaPago: "credito", pagada: false, cierreId: { not: null } }, _sum: { totalCents: true } }),
    // Ventas aún sin cerrar: su efectivo ya está en el cajón pero todavía no en los fondos.
    db.venta.aggregate({ where: { cierreId: null }, _sum: { totalCents: true } }),
  ]);

  const saldoPorFondo = new Map(saldos.map((g) => [g.fondoId, g._sum.montoCents ?? 0]));
  const desglose = fondosEfectivo.map((f) => ({ nombre: f.nombre, saldo: saldoPorFondo.get(f.id) ?? 0 }));
  const fondosCents = desglose.reduce((a, d) => a + d.saldo, 0);
  const fiadoPendienteCents = fiado._sum.totalCents ?? 0;
  const ventasSinCerrarCents = sinCerrar._sum.totalCents ?? 0;

  return {
    esperadoCents: fondosCents - fiadoPendienteCents,
    fondosCents,
    fiadoPendienteCents,
    ventasSinCerrarCents,
    desglose,
  };
}
