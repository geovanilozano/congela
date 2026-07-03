-- CreateTable
CREATE TABLE "Activo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'otro',
    "marca" TEXT,
    "capacidad" TEXT,
    "consumoKwh" REAL,
    "costoCents" INTEGER NOT NULL DEFAULT 0,
    "fechaCompra" DATETIME,
    "garantiaHasta" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "ubicacion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Produccion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "turno" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'cubo',
    "bolsas" INTEGER NOT NULL DEFAULT 0,
    "kilos" REAL,
    "perdidas" INTEGER NOT NULL DEFAULT 0,
    "activoId" INTEGER,
    "nota" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Produccion_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InsumoInventario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "unidad" TEXT NOT NULL DEFAULT 'unidad',
    "stock" REAL NOT NULL DEFAULT 0,
    "stockMinimo" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MovimientoInventario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "insumoId" INTEGER NOT NULL,
    "cantidad" REAL NOT NULL,
    "concepto" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MovimientoInventario_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "InsumoInventario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompraGasto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "proveedor" TEXT,
    "valorCents" INTEGER NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fotoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "InsumoInventario_nombre_key" ON "InsumoInventario"("nombre");
