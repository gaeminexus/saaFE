// Ambiente de DESARROLLO (npm start)
export const environment = {
  production: false,
  apiUrl: '/SaaBE/rest', // Usa proxy de desarrollo (proxy.conf.json mapea /SaaBE/*)
  /**
   * Endpoints del plan de devengo de aportes (§4 de docs/crd/PLAN-APORTES-DEVENGO-CONTRATOS.md)
   * que el backend todavía no publica: /rest/cnfg, /rest/vgcn, /rest/cntr/porEntidad,
   * /rest/aprt/estadoCuenta. Mientras esté en `true`, los servicios correspondientes devuelven
   * datos simulados contra el contrato congelado en vez de llamar al backend. Apagarlo (o que el
   * backend publique y se borre este flag) hace que llamen al backend real sin tocar ningún
   * componente — la rama vive entera dentro de cada servicio.
   */
  mockDevengoContratos: true,
};
