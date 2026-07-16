// Única puerta a la base de datos (Neon Postgres). Reutiliza el cliente en
// desarrollo para no abrir conexiones nuevas en cada recarga de Next.js.
//
// Usa el driver serverless de Neon (@prisma/adapter-neon): la conexión por
// WebSocket arranca en frío bastante más rápido que una conexión TCP tradicional,
// lo que baja la latencia del primer clic en las funciones serverless de Vercel.
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// En Node, el driver de Neon necesita un constructor de WebSocket. Node 22+ ya
// trae uno global; se fija "ws" para funcionar en cualquier versión de Node.
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
