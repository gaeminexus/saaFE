export const MENSAJE_SIN_USUARIO_SESION =
  'No se pudo identificar su usuario en esta sesión. Cierre sesión y vuelva a ingresar.';

function numeroPositivo(valor: unknown): number | null {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function leerUsuario(storage: Storage): number | null {
  try {
    const id = numeroPositivo(storage.getItem('idUsuario'));
    if (id) return id;
    const crudo = storage.getItem('usuario');
    return crudo ? numeroPositivo(JSON.parse(crudo)?.codigo) : null;
  } catch {
    return null;
  }
}

/**
 * Código del usuario de la sesión, o `null` si no se puede identificar. El login lo guarda en
 * `sessionStorage` (`idUsuario` y `usuario.codigo`); `localStorage` solo es respaldo. Nunca devuelve
 * un relleno (1, 0): quien lo llame debe NO enviar la operación si es `null` y mostrar
 * `MENSAJE_SIN_USUARIO_SESION`.
 */
export function idUsuarioSesion(): number | null {
  return leerUsuario(sessionStorage) ?? leerUsuario(localStorage);
}

/** Objeto `usuario` que guarda el login, parseado, o `null` si no está o no se puede leer. */
export function usuarioSesion(): any | null {
  for (const storage of [sessionStorage, localStorage]) {
    try {
      const crudo = storage.getItem('usuario');
      const u = crudo ? JSON.parse(crudo) : null;
      if (u && typeof u === 'object') return u;
    } catch { /* se prueba el siguiente */ }
  }
  return null;
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
}

function leerNombre(storage: Storage): string | null {
  let delObjeto: string | null = null;
  try {
    const crudo = storage.getItem('usuario');
    delObjeto = crudo ? texto(JSON.parse(crudo)?.nombre) : null;
  } catch { /* JSON ilegible: se siguen probando las otras claves */ }
  return delObjeto ?? texto(storage.getItem('username')) ?? texto(storage.getItem('userName'));
}

/**
 * Nombre del usuario de la sesión, o `null`. Orden: `usuario.nombre`, `username`, `userName`, primero
 * en `sessionStorage` y después en `localStorage`. Sin relleno: si es `null` la pantalla no envía.
 */
export function nombreUsuarioSesion(): string | null {
  return leerNombre(sessionStorage) ?? leerNombre(localStorage);
}
