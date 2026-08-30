// Ambiente de PRODUCCIÓN (ng build --configuration production)
export const environment = {
  production: true,
  apiUrl: '/SaaBE/rest',  // Ruta relativa en EAR
  // Nunca simular en producción, aunque el backend todavía no haya publicado el endpoint.
  mockCobroPetro: false,
  mockCertificadosParticipe: false,
};
