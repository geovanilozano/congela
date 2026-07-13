// Autorización DENTRO de los server actions.
//
// El proxy bloquea las páginas por rol, pero eso es un chequeo optimista: un server
// action es un endpoint POST y la seguridad de verdad tiene que estar aquí, junto a la
// operación. (Es justo lo que recomienda la documentación de Next.js: comprobación
// rápida en el proxy, autorización real en la capa de datos.)
import { getSesion } from "./session";
import { type Rol } from "./permisos";

/** Lanza si no hay sesión con uno de los roles permitidos. Devuelve la sesión si pasa. */
export async function exigirRol(...roles: Rol[]) {
  const sesion = await getSesion();
  if (!sesion || !roles.includes(sesion.rol as Rol)) {
    throw new Error("No tienes permiso para hacer esto.");
  }
  return sesion;
}

/** Atajo: solo el dueño (finanzas, usuarios, borrar datos, configuración sensible). */
export const exigirDueno = () => exigirRol("dueno");
