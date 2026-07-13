"use client";

import { useState } from "react";
import { formatMiles } from "@/lib/finance/money";

// Input de dinero en pesos con separador de miles.
// Muestra "1.500.000" mientras se escribe (fácil de leer, difícil poner un cero de más)
// y manda al servidor el número limpio ("1500000") a través de un campo oculto con el
// `name` real. El input visible no lleva `name`, así no se envía el texto formateado.
export function InputDinero({
  name,
  defaultValue,
  required = false,
  placeholder,
  className = "",
  id,
}: {
  name: string;
  defaultValue?: number | null;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const inicial = defaultValue != null && defaultValue > 0 ? String(Math.round(defaultValue)) : "";
  const [digitos, setDigitos] = useState(inicial);

  return (
    <div>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        required={required}
        placeholder={placeholder}
        value={formatMiles(digitos)}
        onChange={(e) => setDigitos(e.target.value.replace(/\D/g, ""))}
        className={className}
      />
      {/* El valor real (número limpio) que recibe el server action. */}
      <input type="hidden" name={name} value={digitos} />
      {digitos !== "" && (
        <p className="mt-1 text-xs text-slate-500">= $ {formatMiles(digitos)}</p>
      )}
    </div>
  );
}
