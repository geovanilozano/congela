// Fuerza la zona horaria del proceso a la de Colombia (UTC-5).
//
// Todo el cálculo de "hoy / este mes / últimos N días" y la construcción de fechas
// (src/lib/fechas.ts) se hace en la hora LOCAL del proceso: new Date(a, m, d),
// .getMonth(), .getDate(), etc. En Vercel las funciones serverless corren en UTC, así
// que sin esto una venta de las 8pm en Colombia se contaría en el día —y el mes— del
// día siguiente, y los resúmenes de "hoy/este mes" del tablero saldrían corridos cada
// noche. register() se ejecuta una sola vez al arrancar cada instancia del servidor,
// antes de atender ninguna petición; al asignar process.env.TZ, Node reajusta la zona
// horaria para todos los Date posteriores.
//
// (Además conviene definir TZ=America/Bogota en las variables de entorno de Vercel; esto
//  lo garantiza a nivel de código aunque falte esa variable.)
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TZ = "America/Bogota";
  }
}
