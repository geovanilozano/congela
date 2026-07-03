-- CreateTable
CREATE TABLE "Inversion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "descripcion" TEXT NOT NULL,
    "proveedor" TEXT,
    "valorCents" INTEGER NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "formaPago" TEXT NOT NULL DEFAULT 'credito',
    "fotoUrl" TEXT,
    "creditoId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Inversion_creditoId_fkey" FOREIGN KEY ("creditoId") REFERENCES "Credito" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Credito" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entidad" TEXT,
    "montoCents" INTEGER NOT NULL,
    "tasaMensual" REAL NOT NULL,
    "numCuotas" INTEGER NOT NULL,
    "fechaInicio" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodicidad" TEXT NOT NULL DEFAULT 'mensual',
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CuotaAmortizacion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "creditoId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "fechaVencimiento" DATETIME NOT NULL,
    "cuotaCents" INTEGER NOT NULL,
    "capitalCents" INTEGER NOT NULL,
    "interesCents" INTEGER NOT NULL,
    "saldoCents" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    CONSTRAINT "CuotaAmortizacion_creditoId_fkey" FOREIGN KEY ("creditoId") REFERENCES "Credito" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PagoCredito" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "creditoId" INTEGER NOT NULL,
    "cuotaId" INTEGER,
    "valorCents" INTEGER NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comprobanteUrl" TEXT,
    CONSTRAINT "PagoCredito_creditoId_fkey" FOREIGN KEY ("creditoId") REFERENCES "Credito" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PagoCredito_cuotaId_fkey" FOREIGN KEY ("cuotaId") REFERENCES "CuotaAmortizacion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Fondo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ReglaReparto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fondoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "valorCents" INTEGER,
    "valor" REAL,
    "prioridad" INTEGER NOT NULL DEFAULT 10,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ReglaReparto_fondoId_fkey" FOREIGN KEY ("fondoId") REFERENCES "Fondo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MovimientoFondo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fondoId" INTEGER NOT NULL,
    "montoCents" INTEGER NOT NULL,
    "concepto" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cierreId" INTEGER,
    CONSTRAINT "MovimientoFondo_fondoId_fkey" FOREIGN KEY ("fondoId") REFERENCES "Fondo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MovimientoFondo_cierreId_fkey" FOREIGN KEY ("cierreId") REFERENCES "CierreCaja" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'contado',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clienteId" INTEGER,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalCents" INTEGER NOT NULL,
    "formaPago" TEXT NOT NULL DEFAULT 'contado',
    "fotoUrl" TEXT,
    "cierreId" INTEGER,
    CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Venta_cierreId_fkey" FOREIGN KEY ("cierreId") REFERENCES "CierreCaja" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VentaItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ventaId" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitCents" INTEGER NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    CONSTRAINT "VentaItem_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CierreCaja" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalCents" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "PagoCredito_cuotaId_key" ON "PagoCredito"("cuotaId");

-- CreateIndex
CREATE UNIQUE INDEX "Fondo_nombre_key" ON "Fondo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ReglaReparto_fondoId_key" ON "ReglaReparto"("fondoId");
