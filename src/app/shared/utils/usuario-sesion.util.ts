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
