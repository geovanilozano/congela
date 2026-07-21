// Utilidades para leer campos de formularios (FormData) de forma segura.

/** Número, o null si el campo viene vacío o no es un número válido. */
export function numeroOpcional(v: FormDataEntryValue | null): number | null {
  if (v === null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
