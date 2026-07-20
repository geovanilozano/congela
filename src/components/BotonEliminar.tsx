"use client";

import { ReactNode } from "react";

// Botón de eliminar con confirmación. Envuelve una acción de servidor en un
// formulario y pide confirmación antes de enviarla, para evitar borrados por error.
export function BotonEliminar({
  action,
  id,
  mensaje = "¿Seguro que quieres eliminar este registro? Esta acción no se puede deshacer.",
  children,
  // Área táctil cómoda y visualmente distinta (es la acción destructiva): en celular un
  // enlace de 12px pegado a "Editar" se toca por error.
  className = "inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50",
}: {
  action: (fd: FormData) => void | Promise<void>;
  id?: number | string;
  mensaje?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      className="inline"
      onSubmit={(e) => {
        if (!confirm(mensaje)) e.preventDefault();
      }}
    >
      {id !== undefined && <input type="hidden" name="id" value={id} />}
      <button type="submit" className={className}>
        {children ?? "Eliminar"}
      </button>
    </form>
  );
}
