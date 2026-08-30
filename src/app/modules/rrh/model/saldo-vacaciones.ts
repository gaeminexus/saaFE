import { Empleado } from './empleado';

/**
 * Saldo anual de vacaciones. Tabla `RHH.SLDV`.
 *
 * El script 05 le añade el período al que corresponde el saldo, los días adicionales por
 * antigüedad —15 por año más uno por cada año a partir del quinto—, los arrastrados del período
 * anterior y la marca de caducidad, que aplica a los tres años según el art. 75 del Código del
 * Trabajo.
 */
export interface SaldoVacaciones {
  codigo: number; // SLDVCDGO
  empleado: Empleado; // MPLDCDGO
  anio: number; // SLDVANOO
  diasAsignados: number; // SLDVASGN
  diasUsados: number; // SLDVUSDO
  diasPendientes: number; // SLDVPNDE
  fechaInicio?: Date | null; // SLDVFCHI - inicio del período de vacaciones
  fechaFin?: Date | null; // SLDVFCHF - fin del período de vacaciones
  diasAdicionales?: number; // SLDVDIAD - por antigüedad
  diasArrastrados?: number; // SLDVDIAR - del período anterior
  diasPagados?: number; // SLDVDIPG - liquidados en dinero
  valorDia?: number | null; // SLDVVLDI
  caducado?: string; // SLDVCDCD - 'S' / 'N'
  aperturaMigracion?: string; // SLDVAPRT - 'S' / 'N'
  estado?: number; // SLDVESTD
  fechaRegistro: Date; // SLDVFCHR
  usuarioRegistro: string; // SLDVUSRR
}

/**
 * Body de POST /sldv/acreditar — el proceso anual que genera el saldo de
 * vacaciones de todos los empleados que cumplieron un año de servicio hasta
 * `fechaCorte`, arrastrando lo no gozado del período anterior y marcando
 * caducados los saldos que superan el plazo configurado. Sin este proceso
 * no existe ningún saldo nuevo — no se genera solo.
 */
export interface AcreditarVacacionesRequest {
  idEmpresa: number;
  /** yyyy-MM-dd. */
  fechaCorte: string;
  usuarioRegistro: string;
}

/**
 * Body de POST /sldv/revertirAcreditacion — contraparte de {@link AcreditarVacacionesRequest}.
 * Contrato confirmado por backend el 2026-08-27: borra los `SaldoVacaciones` de
 * `(idEmpresa, anio)` — no es por id de acreditación, no existe como entidad propia. Todo o
 * nada: si algún empleado ya usó o le pagaron días de ese saldo (`diasUsados`/`diasPagados` > 0)
 * o el saldo viene de migración, el backend rechaza la reversión completa nombrando al empleado
 * bloqueante (500, texto plano).
 */
export interface RevertirAcreditacionVacacionesRequest {
  idEmpresa: number;
  anio: number;
  usuarioRegistro: string;
}
