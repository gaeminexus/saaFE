export interface InformacionGeneralFondo {
  codigo: number | null;
  tipoIdentificacionFcpc: string;
  identificacionFcpc: string;
  numeroResolucion: string;
  fechaResolucion: any;
  provincia: string;
  canton: string;
  direccion: string;
  telefonos: string;
  correoElectronico: string;
  tipoSistema: string;
  tipoPrestacion: string;
  tipoAporte: string;
  tipoAdministracion: string;
  fechaTraspaso: any;
  tipoFcpc: string;
  numeroResolucionCambioEstatuto: string;
  fechaResolucionCambioEstatuto: any;
  cambioNombre: string;
  porcentajeAportePatronalCesantia: number;
  porcentajeAportePersonalCesantia: number;
  porcentajeAportePatronalJubilacion: number;
  porcentajeAportePersonalJubilacion: number;
  valorAportePersonalCesantia: number;
  valorAportePersonalJubilacion: number;
}
