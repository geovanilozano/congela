"use client";

import { ReactNode } from "react";

// Envuelve una acción de servidor en un formulario que pide confirmación antes de enviarse.
// Para acciones de peso pero NO destructivas (p. ej. "Cerrar caja", que reparte el dinero
// del día en los fondos). Deja dentro cualquier botón —incluido BotonGuardar con su estado
// de "enviando"— a diferencia de BotonEliminar, que trae su propio botón rojo.
export function FormConfirm({
  action,
  mensaje,
  className,
  children,
}: {
  action: (fd: FormData) => void | Promise<void>;
  mensaje: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (!confirm(mensaje)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
