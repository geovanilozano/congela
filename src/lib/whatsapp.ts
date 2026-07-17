// Enlace "click para chatear" de WhatsApp (gratis, sin API): abre WhatsApp con un
// mensaje ya escrito hacia el número del cliente. No envía nada solo; el dueño revisa
// y presiona enviar. Por eso no tiene costo ni necesita cuenta de WhatsApp Business.

/**
 * Normaliza un teléfono colombiano a formato internacional para wa.me.
 * - Quita todo lo que no sea dígito (espacios, guiones, "+").
 * - Si son 10 dígitos (celular colombiano), antepone el indicativo 57.
 * - Si ya trae indicativo (12 dígitos que empiezan por 57), lo deja igual.
 * Devuelve null si no queda un número usable.
 */
export function normalizarTelefonoCo(telefono: string | null | undefined): string | null {
  const digitos = String(telefono ?? "").replace(/\D/g, "");
  if (digitos.length < 7) return null; // ni un teléfono fijo válido
  if (digitos.length === 10) return `57${digitos}`;
  return digitos;
}

/**
 * Arma el enlace de WhatsApp con el mensaje. Devuelve null si el teléfono no sirve.
 */
export function enlaceWhatsApp(telefono: string | null | undefined, mensaje: string): string | null {
  const numero = normalizarTelefonoCo(telefono);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
