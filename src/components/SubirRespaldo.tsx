"use client";

// Formulario para restaurar un respaldo (.json). Pide confirmación antes de enviarlo,
// porque reemplaza TODOS los datos actuales. Exige elegir un archivo.
import { BotonGuardar } from "@/components/BotonGuardar";

export function SubirRespaldo({ action }: { action: (fd: FormData) => void | Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const input = e.currentTarget.querySelector<HTMLInputElement>('input[type="file"]');
        if (!input?.files?.length) {
          e.preventDefault();
          alert("Primero elige el archivo de respaldo (.json).");
          return;
        }
        if (!confirm("Esto REEMPLAZA todos los datos actuales por los del respaldo. ¿Continuar?")) {
          e.preventDefault();
        }
      }}
      className="mt-3 flex flex-wrap items-center gap-3"
    >
      <input
        type="file"
        name="respaldo"
        accept="application/json,.json"
        className="text-sm text-slate-600"
      />
      <BotonGuardar
        pendingText="Restaurando…"
        className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
      >
        ⬆️ Restaurar respaldo
      </BotonGuardar>
    </form>
  );
}
