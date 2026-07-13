// Única puerta a la base de datos. Reutiliza el cliente en desarrollo para no
// abrir conexiones nuevas en cada recarga de Next.js.
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Si falta DATABASE_URL, se usa la misma ruta que crean las migraciones. (Antes el
// respaldo apuntaba a ./dev.db: la app abría una base vacía distinta y parecía que
// se habían borrado los datos.)
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
