-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CuotaAmortizacion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "creditoId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "fechaVencimiento" DATETIME NOT NULL,
    "cuotaCents" INTEGER NOT NULL,
    "capitalCents" INTEGER NOT NULL,
    "interesCents" INTEGER NOT NULL,
    "saldoCents" INTEGER NOT NULL,
    "abonadoCents" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    CONSTRAINT "CuotaAmortizacion_creditoId_fkey" FOREIGN KEY ("creditoId") REFERENCES "Credito" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CuotaAmortizacion" ("capitalCents", "creditoId", "cuotaCents", "estado", "fechaVencimiento", "id", "interesCents", "numero", "saldoCents") SELECT "capitalCents", "creditoId", "cuotaCents", "estado", "fechaVencimiento", "id", "interesCents", "numero", "saldoCents" FROM "CuotaAmortizacion";
DROP TABLE "CuotaAmortizacion";
ALTER TABLE "new_CuotaAmortizacion" RENAME TO "CuotaAmortizacion";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Backfill: una cuota ya "pagada" tiene abonado su valor completo.
UPDATE "CuotaAmortizacion" SET "abonadoCents" = "cuotaCents" WHERE "estado" = 'pagada';
