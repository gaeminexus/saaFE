import { Empresa } from '../../../shared/model/empresa';

/**
 * Causal de terminación de la relación laboral. Tabla `RHH.CSTR`.
 *
 * Las banderas determinan qué rubros entran en el finiquito, de modo que el cálculo de la
 * liquidación no necesita conocer ninguna causal por su nombre.
 */
export interface CausalTerminacion {
  codigo: number; // CSTRCDGO
  empresa: Empresa | null; // PJRQCDGO
  nombre: string; // CSTRNMBR
  codigoAlterno: number; // CSTRALTR - detalle del rubro 195
  articulo: string | null; // CSTRARTC - artículo del Código del Trabajo
  generaDesahucio: string; // CSTRDSHC - 'S' / 'N'
  generaDespido: string; // CSTRDSPD - 'S' / 'N', indemnización por despido intempestivo
  pagaVacacionesProporcionales: string; // CSTRVCPR - 'S' / 'N'
  pagaDecimosProporcionales: string; // CSTRDCPR - 'S' / 'N'
  generaJubilacionPatronal: string; // CSTRJBPT - 'S' / 'N'
  requiereAvisoSalida: string; // CSTRAVSL - 'S' / 'N', aviso de salida al IESS
  requiereActaSut: string; // CSTRACSU - 'S' / 'N', acta de finiquito en el SUT
  estado: number; // CSTRESTD
  fechaRegistro?: Date; // CSTRFCHR
  usuarioRegistro?: string; // CSTRUSRR
}
