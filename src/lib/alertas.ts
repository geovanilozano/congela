// Resumen de pendientes del negocio para la notificación push diaria. Reúne lo mismo que
// muestra el Centro de Alertas del tablero: fiado por cobrar, cuotas vencidas, ventas sin
// cerrar y bajo stock. Se consulta desde el endpoint del cron.
import { db } from "@/lib/db";
import { estadoCuota } from "@/lib/finance/cuotas";
import { bajoStock } from "@/lib/inventario";
import { formatMoney } from "@/lib/finance/money";

export interface ResumenAvisos {
  hay: boolean;
  titulo: string;
  cuerpo: string;
}

export async function resumenParaNotificar(): Promise<ResumenAvisos> {
  const hoy = new Date();
  const [creditos, insumos, ventasPendientes, fiado] = await Promise.all([
    db.credito.findMany({ where: { estado: { not: "pagado" } }, include: { cuotas: true } }),
    db.insumoInventario.findMany(),
    db.venta.findMany({ where: { cierreId: null }, select: { totalCents: true } }),
    db.venta.findMany({ where: { formaPago: "credito", pagada: false }, select: { clienteId: true, totalCents: true } }),
  ]);

  const cuotas = creditos.flatMap((c) => c.cuotas);
  const vencidas = cuotas.filter((q) => estadoCuota(q, hoy) === "vencida");
  const insumosBajos = bajoStock(insumos);
  const pendientesCents = ventasPendientes.reduce((a, v) => a + v.totalCents, 0);
  const fiadoCents = fiado.reduce((a, v) => a + v.totalCents, 0);
  const clientesDeben = new Set(fiado.filter((v) => v.clienteId != null).map((v) => v.clienteId)).size;

  const lineas: string[] = [];
  if (fiadoCents > 0) lineas.push(`Te deben ${formatMoney(fiadoCents)} en fiado${clientesDeben > 0 ? ` (${clientesDeben} cliente(s))` : ""}`);
  if (vencidas.length > 0) lineas.push(`${vencidas.length} cuota(s) del crédito vencida(s)`);
  if (pendientesCents > 0) lineas.push(`${formatMoney(pendientesCents)} en ventas sin cerrar — recuerda cerrar la caja`);
  if (insumosBajos.length > 0) lineas.push(`${insumosBajos.length} insumo(s) con bajo stock`);

  return {
    hay: lineas.length > 0,
    titulo: lineas.length > 0 ? "Congela — pendientes de hoy" : "Congela",
    cuerpo: lineas.length > 0 ? lineas.join(" · ") : "Todo al día ✅",
  };
}
