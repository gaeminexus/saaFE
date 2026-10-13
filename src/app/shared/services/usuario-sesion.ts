/**
 * Nombre del usuario de la sesión, para los campos `usuario` que exigen los endpoints de
 * escritura del backend (máx. 50 caracteres).
 *
 * Se consultan varias claves porque el login y `AppStateService` escriben el mismo dato con
 * nombres distintos y no todos existen en ambos almacenamientos: `login.component.ts` guarda
 * `username` en sessionStorage Y localStorage, mientras que `AppStateService.inicializarApp()`
 * guarda `userName` solo en sessionStorage. Leer una sola clave hace que el usuario quede como
 * 'SYSTEM' según por dónde se haya inicializado la sesión.
 */
export function usuarioSesion(): string {
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
  return (encontrado ?? 'SYSTEM').trim().slice(0, 50);
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
