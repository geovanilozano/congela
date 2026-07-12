"use client";

import { ReactNode } from "react";
import { useFormStatus } from "react-dom";

// Botón de envío que se bloquea mientras la acción está en curso.
// Evita registros duplicados por doble clic y da feedback ("Guardando…").
export function BotonGuardar({
  children,
  className,
  pendingText = "Guardando…",
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  pendingText?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? pendingText : children}
    </button>
  );
}
