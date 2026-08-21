/**
 * Código de la empresa activa en la sesión.
 *
 * `AppStateService.normalizarContextoEmpresa()` escribe el mismo valor bajo seis claves legadas
 * en ambos almacenamientos; esta función lee la clave normalizada y cae a las alternativas por
 * si la sesión se inicializó por otro camino. Gemela de `usuario-sesion.ts`.
 *
 * @returns el código de empresa, o `null` si no hay una sesión con empresa establecida.
 */
export function empresaSesionCodigo(): number | null {
  const candidatos = [
    sessionStorage.getItem('idEmpresa'),
    localStorage.getItem('idEmpresa'),
    sessionStorage.getItem('empresaId'),
    localStorage.getItem('empresaId'),
  ];

  const encontrado = candidatos.find((v) => !!v && v.trim().length > 0);
  if (!encontrado) return null;

  const codigo = parseInt(encontrado, 10);
  return Number.isNaN(codigo) ? null : codigo;
}
