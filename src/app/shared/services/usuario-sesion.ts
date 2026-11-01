/**
 * Nombre del usuario de la sesión, para los campos `usuario` que exigen los endpoints de
 * escritura del backend (máx. 50 caracteres).
 *
 * Se consultan varias claves porque el login y `AppStateService` escriben el mismo dato con
 * nombres distintos y no todos existen en ambos almacenamientos: `login.component.ts` guarda
 * `username` en sessionStorage Y localStorage, mientras que `AppStateService.inicializarApp()`
 * guarda `userName` solo en sessionStorage. Leer una sola clave haría perder el usuario según por
 * dónde se haya inicializado la sesión.
 */
export function leerUsuarioSesion(): string | null {
  const candidatos = [
    sessionStorage.getItem('username'),
    localStorage.getItem('username'),
    sessionStorage.getItem('userName'),
    localStorage.getItem('userName'),
    leerNombreDeJson(sessionStorage.getItem('usuario')),
    leerNombreDeJson(sessionStorage.getItem('usuarioLog')),
    leerNombreDeJson(localStorage.getItem('usuarioLog')),
  ];

  const encontrado = candidatos.find((v) => !!v && v.trim().length > 0);
  return encontrado ? encontrado.trim().slice(0, 50) : null;
}

/** ¿Hay un usuario de sesión? No lanza ni limpia nada: es para guards e interceptores. */
export function hayUsuarioSesion(): boolean {
  return leerUsuarioSesion() !== null;
}

/** Evento que avisa a `SesionPerdidaService` que se perdió el usuario (sale y manda a /login). */
export const EVENTO_SESION_PERDIDA = 'saafe:sesion-perdida';

export const MENSAJE_SESION_PERDIDA = 'Tu sesión se perdió; vuelve a ingresar';

/** El usuario de la sesión se perdió: la operación NO debe seguir. */
export class SesionPerdidaError extends Error {
  constructor() {
    super(MENSAJE_SESION_PERDIDA);
    this.name = 'SesionPerdidaError';
  }
}

/**
 * Usuario de la sesión, sin relleno: si no hay, **no se inventa uno**. Un usuario inventado
 * ('SYSTEM', 'sistema') acababa grabado en asientos y procesos reales. Si no hay usuario se
 * avisa a `SesionPerdidaService` (cierra la sesión y manda a /login) y se lanza
 * `SesionPerdidaError`, así la operación que lo pidió no llega a enviarse.
 */
export function usuarioSesion(): string {
  const usuario = leerUsuarioSesion();
  if (!usuario) {
    window.dispatchEvent(new Event(EVENTO_SESION_PERDIDA));
    throw new SesionPerdidaError();
  }
  return usuario;
}

function leerNombreDeJson(bruto: string | null): string | null {
  if (!bruto) return null;
  try {
    const obj = JSON.parse(bruto);
    return obj?.nombre ?? obj?.usuario ?? obj?.username ?? null;
  } catch {
    return null;
  }
}

/**
 * Código NUMÉRICO del usuario de la sesión (no el login): lo escribe
 * `AppStateService.inicializarApp()` bajo `idUsuario`. Es el que exigen, p. ej., la aprobación de
 * un préstamo y varias pantallas de devoluciones.
 *
 * @returns el código, o `null` si no hay sesión con usuario establecido (nunca 0).
 */
export function idUsuarioSesion(): number | null {
  const bruto = sessionStorage.getItem('idUsuario') || localStorage.getItem('idUsuario');
  const codigo = bruto ? parseInt(bruto, 10) : NaN;
  return Number.isNaN(codigo) || codigo <= 0 ? null : codigo;
}
