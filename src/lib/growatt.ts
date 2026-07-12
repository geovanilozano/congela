// Cliente para leer la generación de los paneles desde la nube de Growatt.
// Usa la API del servidor de Growatt (no oficial), por eso maneja los errores con cuidado.
import { createHash } from "node:crypto";

const BASE = "https://server.growatt.com";

// Growatt cifra la clave con MD5 y luego, en cada par de dígitos que empieza por "0",
// reemplaza ese "0" por "c". Es una particularidad conocida de su API.
function hashGrowatt(pwd: string): string {
  const h = createHash("md5").update(pwd, "utf8").digest("hex");
  let out = "";
  for (let i = 0; i < h.length; i += 2) {
    const par = h.slice(i, i + 2);
    out += par[0] === "0" ? "c" + par[1] : par;
  }
  return out;
}

function numeroDe(valor: unknown): number | null {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") {
    const n = parseFloat(valor.replace(/[^0-9.,-]/g, "").replace(",", "."));
    return isNaN(n) ? null : n;
  }
  return null;
}

export type ResultadoGrowatt =
  | { ok: true; kwhHoy: number }
  | { ok: false; error: string };

export async function sincronizarGrowatt(usuario: string, clave: string): Promise<ResultadoGrowatt> {
  if (!usuario || !clave) return { ok: false, error: "Faltan el usuario y la clave de Growatt." };

  const headersBase = {
    "User-Agent": "Mozilla/5.0",
    "content-type": "application/x-www-form-urlencoded",
  };

  try {
    // 1) Iniciar sesión.
    const loginResp = await fetch(`${BASE}/newTwoLoginAPI.do`, {
      method: "POST",
      headers: headersBase,
      body: `userName=${encodeURIComponent(usuario)}&password=${hashGrowatt(clave)}`,
    });
    const loginJson = await loginResp.json().catch(() => ({}));
    const exito = loginJson?.back?.success === true;
    if (!exito) return { ok: false, error: "Growatt rechazó el usuario o la clave." };

    const cookies = (loginResp.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    const jsession = cookies.map((c) => c.split(";")[0]).join("; ");

    // 2) Traer la lista de plantas (incluye la generación de hoy).
    const plantResp = await fetch(`${BASE}/PlantListAPI.do`, {
      method: "POST",
      headers: { ...headersBase, Cookie: jsession },
      body: "",
    });
    const plantJson = await plantResp.json().catch(() => ({}));
    const plantas = plantJson?.back?.data;
    if (!Array.isArray(plantas) || plantas.length === 0) {
      return { ok: false, error: "No se encontraron plantas en la cuenta de Growatt." };
    }

    // Sumar la generación de hoy de todas las plantas (el nombre del campo varía).
    let kwhHoy = 0;
    let encontrado = false;
    for (const p of plantas) {
      const val = p.eToday ?? p.todayEnergy ?? p.energy ?? p.eac_today ?? p.currentEnergy;
      const n = numeroDe(val);
      if (n !== null) {
        kwhHoy += n;
        encontrado = true;
      }
    }
    if (!encontrado) return { ok: false, error: "No se pudo leer la generación de hoy desde Growatt." };

    return { ok: true, kwhHoy: Math.round(kwhHoy * 100) / 100 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al conectar con Growatt.";
    return { ok: false, error: `No se pudo conectar con Growatt: ${msg}` };
  }
}
