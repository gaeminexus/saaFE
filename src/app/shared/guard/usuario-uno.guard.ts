import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * ⚠️ TODO TEMPORAL — restricción de acceso provisional.
 *
 * Las pantallas de bandas de cartera y de cierre de cartera deben quedar accesibles
 * ÚNICAMENTE para el usuario "USUARIO 1" mientras se define el esquema de permisos
 * definitivo. Este archivo es el ÚNICO lugar donde vive esa regla: el guard bloquea la
 * navegación directa por URL y `esUsuarioUno()` se reutiliza para ocultar la opción de
 * menú. Cuando exista el sistema de permisos real, sustituir `esUsuarioUno()` por la
 * verificación de permiso correspondiente y eliminar este guard (no ampliar esta lógica
 * ad hoc).
 *
 * ────────────────────────────────────────────────────────────────────────────────────
 * CORREGIDO el 2026-08-25. La versión anterior comparaba contra el CÓDIGO 1
 * (`CODIGO_USUARIO_PERMITIDO = 1`) porque interpretó "USUARIO 1" como "el usuario con
 * código 1". Es falso: "USUARIO 1" es el NOMBRE de la cuenta y su código es 38, y
 * **ningún usuario del sistema tiene el código 1** (verificado contra
 * `GET /rest/usro/getAll`: los códigos son 970 ADMIN, 51 RAIZ USUARIO, 38 USUARIO 1,
 * 1238-1248 …). Con esa comparación el guard devolvía false para todo el mundo, así que
 * la opción de menú no aparecía ni siquiera entrando como USUARIO 1.
 *
 * Se compara por NOMBRE y no por código a propósito: el código 38 es un dato de esta
 * instalación y cambiaría en otra, mientras que el nombre es el mismo concepto en
 * cualquiera. La comparación normaliza mayúsculas y espacios, pero es EXACTA — un
 * `includes` haría pasar también a "RAIZ USUARIO".
 * ────────────────────────────────────────────────────────────────────────────────────
 */

const NOMBRE_USUARIO_PERMITIDO = 'USUARIO 1';

/**
 * true solo si el usuario logueado es "USUARIO 1".
 *
 * Claves de sesión realmente escritas (verificado en el código, no supuesto):
 *  - `AppStateService.inicializarApp` escribe `usuario` (objeto `Usuario` serializado,
 *    con `.nombre` y `.codigo`), `userName` (nombre tal como se tecleó) e `idUsuario`
 *    (el código, como string).
 *  - `LoginComponent` escribe `logged` y `username` (nombre YA en mayúsculas).
 *  - `usuarioLog` NO lo escribe nadie en storage: `usuarioService.setUsuarioLog()` es un
 *    setter en memoria. La versión anterior de este guard lo leía como respaldo y ese
 *    respaldo estaba muerto.
 */
export function esUsuarioUno(): boolean {
  const nombre = obtenerNombreUsuario();
  return nombre !== null && nombre === NOMBRE_USUARIO_PERMITIDO;
}

/**
 * Nombre del usuario en sesión, normalizado (mayúsculas, sin espacios sobrantes y con
 * los espacios internos colapsados), o null si no hay sesión legible.
 */
function obtenerNombreUsuario(): string | null {
  try {
    const usuarioStr =
      sessionStorage.getItem('usuario') ?? localStorage.getItem('usuario');
    if (usuarioStr) {
      const usuario = JSON.parse(usuarioStr);
      const nombre = normaliza(usuario?.nombre);
      if (nombre !== null) {
        return nombre;
      }
    }

    // Respaldos: 'username' lo escribe el login (ya en mayúsculas) y 'userName' el
    // AppStateService (tal como se tecleó). Sirven si el objeto 'usuario' aún no está.
    for (const clave of ['username', 'userName']) {
      const valor = sessionStorage.getItem(clave) ?? localStorage.getItem(clave);
      const nombre = normaliza(valor);
      if (nombre !== null) {
        return nombre;
      }
    }
  } catch {
    // Storage restringido o JSON inválido: se trata como usuario no permitido.
  }
  return null;
}

/** Mayúsculas, recortado y con los espacios internos colapsados. null si queda vacío. */
function normaliza(valor: unknown): string | null {
  if (typeof valor !== 'string') {
    return null;
  }
  const limpio = valor.trim().replace(/\s+/g, ' ').toUpperCase();
  return limpio === '' ? null : limpio;
}

/**
 * Guard de ruta: permite el acceso solo a "USUARIO 1". Si no lo es, redirige al menú de
 * créditos (o al login si ni siquiera hay sesión).
 */
export const usuarioUnoGuard: CanActivateFn = () => {
  const router = inject(Router);

  if (esUsuarioUno()) {
    return true;
  }

  const isLogged = sessionStorage.getItem('logged') === 'true';
  console.warn('usuarioUnoGuard: acceso denegado. Pantalla restringida a USUARIO 1.');
  return router.createUrlTree([isLogged ? '/menucreditos/parametrizacion' : '/login']);
};
