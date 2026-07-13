// Firma y verificación del token de sesión (HMAC con Web Crypto).
// Sin dependencias de Node ni de next/headers, para poder usarse también en el middleware.

export interface Sesion {
  userId: number;
  rol: string;
  nombre: string;
}

/** Lo que va firmado dentro del token: la sesión + su fecha de vencimiento. */
interface Payload extends Sesion {
  exp: number; // vencimiento, en segundos desde 1970
}

export const COOKIE_SESION = "congela_sesion";

/** Duración de la sesión: 30 días. */
export const DURACION_SESION_SEG = 60 * 60 * 24 * 30;

const CLAVE_INSEGURA = "congela-secreto-local-cambialo";

/**
 * Clave con la que se firman las sesiones.
 * En producción es OBLIGATORIA: sin ella, cualquiera podría fabricarse una sesión
 * de Dueño. Se valida al usarla (no al importar el archivo) para no romper el build.
 */
function secreto(): string {
  const s = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!s || s === CLAVE_INSEGURA)) {
    throw new Error(
      "Falta AUTH_SECRET. Define una clave larga y secreta en las variables de entorno " +
        "antes de publicar la app; si no, cualquiera podría entrar como Dueño.",
    );
  }
  return s || CLAVE_INSEGURA;
}

function bytesAB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlABytes(s: string): Uint8Array {
  const norm = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(norm);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function enc(s: string): BufferSource {
  return new TextEncoder().encode(s) as BufferSource;
}

async function claveHmac() {
  return crypto.subtle.importKey("raw", enc(secreto()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/** Firma la sesión. El token vence a los 30 días. */
export async function firmar(sesion: Sesion): Promise<string> {
  const payload: Payload = {
    ...sesion,
    exp: Math.floor(Date.now() / 1000) + DURACION_SESION_SEG,
  };
  const datos = bytesAB64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await claveHmac();
  const sig = await crypto.subtle.sign("HMAC", key, enc(datos));
  return `${datos}.${bytesAB64url(new Uint8Array(sig))}`;
}

/**
 * Comprueba la firma y el vencimiento del token.
 * Ojo: esto NO dice si el usuario sigue habilitado — eso se consulta en la base de
 * datos (ver `sesionValida` en `dal.ts`). Aquí solo se valida el papel, no la persona.
 */
export async function verificar(token: string | undefined | null): Promise<Sesion | null> {
  if (!token) return null;
  const [datos, sig] = token.split(".");
  if (!datos || !sig) return null;
  try {
    const key = await claveHmac();
    const ok = await crypto.subtle.verify("HMAC", key, b64urlABytes(sig) as BufferSource, enc(datos));
    if (!ok) return null;

    const payload = JSON.parse(new TextDecoder().decode(b64urlABytes(datos))) as Payload;

    // Token vencido (o sin vencimiento: los emitidos por la versión anterior).
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;

    return { userId: payload.userId, rol: payload.rol, nombre: payload.nombre };
  } catch {
    return null;
  }
}
