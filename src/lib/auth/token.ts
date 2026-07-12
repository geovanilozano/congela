// Firma y verificación del token de sesión (HMAC con Web Crypto).
// Sin dependencias de Node ni de next/headers, para poder usarse también en el middleware.

export interface Sesion {
  userId: number;
  rol: string;
  nombre: string;
}

export const COOKIE_SESION = "congela_sesion";

const SECRET = process.env.AUTH_SECRET || "congela-secreto-local-cambialo";

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
  return crypto.subtle.importKey("raw", enc(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function firmar(payload: Sesion): Promise<string> {
  const datos = bytesAB64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await claveHmac();
  const sig = await crypto.subtle.sign("HMAC", key, enc(datos));
  return `${datos}.${bytesAB64url(new Uint8Array(sig))}`;
}

export async function verificar(token: string | undefined | null): Promise<Sesion | null> {
  if (!token) return null;
  const [datos, sig] = token.split(".");
  if (!datos || !sig) return null;
  try {
    const key = await claveHmac();
    const ok = await crypto.subtle.verify("HMAC", key, b64urlABytes(sig) as BufferSource, enc(datos));
    if (!ok) return null;
    return JSON.parse(new TextDecoder().decode(b64urlABytes(datos)));
  } catch {
    return null;
  }
}
