-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Inversion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "descripcion" TEXT NOT NULL,
    "proveedor" TEXT,
    "valorCents" INTEGER NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "formaPago" TEXT NOT NULL DEFAULT 'credito',
    "fotoUrl" TEXT,
    "creditoId" INTEGER,
    "activoId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Inversion_creditoId_fkey" FOREIGN KEY ("creditoId") REFERENCES "Credito" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Inversion_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Inversion" ("createdAt", "creditoId", "descripcion", "fecha", "formaPago", "fotoUrl", "id", "proveedor", "valorCents") SELECT "createdAt", "creditoId", "descripcion", "fecha", "formaPago", "fotoUrl", "id", "proveedor", "valorCents" FROM "Inversion";
DROP TABLE "Inversion";
ALTER TABLE "new_Inversion" RENAME TO "Inversion";
CREATE UNIQUE INDEX "Inversion_activoId_key" ON "Inversion"("activoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
