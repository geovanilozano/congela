-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Venta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clienteId" INTEGER,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalCents" INTEGER NOT NULL,
    "formaPago" TEXT NOT NULL DEFAULT 'contado',
    "pagada" BOOLEAN NOT NULL DEFAULT false,
    "pagadaEn" DATETIME,
    "fotoUrl" TEXT,
    "cierreId" INTEGER,
    CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Venta_cierreId_fkey" FOREIGN KEY ("cierreId") REFERENCES "CierreCaja" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Venta" ("cierreId", "clienteId", "fecha", "formaPago", "fotoUrl", "id", "totalCents") SELECT "cierreId", "clienteId", "fecha", "formaPago", "fotoUrl", "id", "totalCents" FROM "Venta";
DROP TABLE "Venta";
ALTER TABLE "new_Venta" RENAME TO "Venta";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Backfill: el contado siempre esta pagado; el credito existente queda por cobrar.
UPDATE "Venta" SET "pagada" = true WHERE "formaPago" = 'contado';
