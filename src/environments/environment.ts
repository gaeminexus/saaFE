// Ambiente de DESARROLLO (npm start)
export const environment = {
  production: false,
  apiUrl: '/SaaBE/rest', // Usa proxy de desarrollo (proxy.conf.json mapea /SaaBE/*)
  /**
   * Endpoints del contrato de cobro de Petro en dos pasos
   * (`docs/crd/API-COBRO-PETRO-DOS-PASOS.md` §2) que el backend todavía no publica: /rest/asgn/
   * transferencias, /rest/asgn/confirmarRecepcion, /rest/asgn/reversarRecepcion,
   * /rest/asgn/estadoContable. Mientras esté en `true`, `ServiciosAsoprepService` simula esos
   * cuatro endpoints en memoria contra el contrato congelado. Apagarlo (o que el backend
   * publique y se borre este flag) hace que llamen al backend real sin tocar los componentes.
   */
  mockCobroPetro: true,
  /**
   * Endpoints de certificados de partícipe (`docs/crd/API-CERTIFICADOS-PARTICIPE.md`) que el
   * backend todavía no publica: /rest/crtf/precarga, /rest/crtf/emitir, /rest/crtf/getByEntidad,
   * /rest/crtf/getByAnio, /rest/crtf/anular. Mientras esté en `true`,
   * `CertificadoParticipeService` simula los 6 tipos en memoria contra el contrato congelado.
   * Apagarlo (o que el backend publique y se borre este flag) hace que llame al backend real sin
   * tocar los componentes.
   */
  mockCertificadosParticipe: true,
  /**
   * Auditoría de distribución en bandas (`docs/crd/API-AUDITORIA-BANDAS.md`): el backend ya
   * publicó los tres endpoints (2026-09-02, `saaBE` commit `c52a850` y posteriores) — por eso
   * queda en `false`. `AuditoriaBandasService` conserva la simulación contra el contrato
   * congelado (carga Petro 449) por si hace falta desarrollar sin backend disponible; poner en
   * `true` la reactiva sin tocar el componente.
   */
  mockAuditoriaBandas: false,
};
