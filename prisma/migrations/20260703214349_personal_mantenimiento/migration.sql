-- CreateTable
CREATE TABLE "Empleado" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT,
    "telefono" TEXT,
    "salarioCents" INTEGER NOT NULL DEFAULT 0,
    "fechaIngreso" DATETIME,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Asistencia" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "empleadoId" INTEGER NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "turno" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'presente',
    "horas" REAL,
    CONSTRAINT "Asistencia_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PagoNomina" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "empleadoId" INTEGER NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valorCents" INTEGER NOT NULL,
    "concepto" TEXT NOT NULL DEFAULT 'Salario',
    "comprobanteUrl" TEXT,
    CONSTRAINT "PagoNomina_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mantenimiento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activoId" INTEGER,
    "tipo" TEXT NOT NULL DEFAULT 'preventivo',
    "descripcion" TEXT NOT NULL,
    "fechaProgramada" DATETIME NOT NULL,
    "fechaRealizada" DATETIME,
    "costoCents" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'programado',
    "nota" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Mantenimiento_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Produccion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "turno" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'cubo',
    "bolsas" INTEGER NOT NULL DEFAULT 0,
    "kilos" REAL,
    "perdidas" INTEGER NOT NULL DEFAULT 0,
    "activoId" INTEGER,
    "empleadoId" INTEGER,
    "nota" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Produccion_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Produccion_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Produccion" ("activoId", "bolsas", "createdAt", "fecha", "id", "kilos", "nota", "perdidas", "tipo", "turno") SELECT "activoId", "bolsas", "createdAt", "fecha", "id", "kilos", "nota", "perdidas", "tipo", "turno" FROM "Produccion";
DROP TABLE "Produccion";
ALTER TABLE "new_Produccion" RENAME TO "Produccion";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
