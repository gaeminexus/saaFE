import { Empresa } from '../../../shared/model/empresa';
import { Empleado } from './empleado';

/**
 * Saldo de apertura de la migración. Tabla `RHH.SLAP`.
 *
 * Es la tabla puente del corte al 31-dic-2025: primero se cargan aquí las filas del archivo,
 * se validan, y solo al aplicar se materializan en su tabla destino (`ACMN`, `SLDV`, `DSRC`…).
 * `tablaReferencia` e `idReferencia` guardan dónde acabó cada fila, que es lo que permite revertir la
 * migración completa sin adivinar.
 */
export interface SaldoApertura {
  codigo: number; // SLAPCDGO
  empresa: Empresa | { codigo: number } | null; // PJRQCDGO
  empleado: Empleado | { codigo: number } | null; // MPLDCDGO - nulo si no se pudo enlazar
  identificacion: string | null; // SLAPIDNT - identificación tal como venía en el archivo
  fechaCorte: Date; // SLAPFCCR
  tipoSaldo: number; // SLAPTPSL - rubro 211
  valor: number; // SLAPVLOR
  dias: number | null; // SLAPDIAS - vacaciones o antigüedad
  fecha: Date | null; // SLAPFCHA - fecha, cuando el saldo es de antigüedad
  anio: number | null; // SLAPANOO
  numeroCuotas: number | null; // SLAPNMCT - cuotas pendientes, en préstamos
  observacion: string | null; // SLAPOBSR
  aplicado: string; // SLAPAPLC - 'S' / 'N'
  fechaAplicacion: Date | null; // SLAPFCAP
  tablaReferencia: string | null; // SLAPRFTB
  idReferencia: number | null; // SLAPRFID
  estado: number; // SLAPESTD
  fechaRegistro?: Date; // SLAPFCHR
  usuarioRegistro?: string; // SLAPUSRR
}
