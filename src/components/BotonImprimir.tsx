"use client";

import { ReactNode } from "react";

// Botón que abre el diálogo de impresión del navegador (permite "Guardar como PDF").
// Se oculta a sí mismo al imprimir (clase no-print).
export function BotonImprimir({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <button type="button" onClick={() => window.print()} className={`no-print ${className ?? ""}`}>
      {children ?? "🖨️ Imprimir / PDF"}
    </button>
  );
}
