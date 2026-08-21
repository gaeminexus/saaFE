import { Empresa } from '../../../shared/model/empresa';

/**
 * Tipo de contrato del empleado. Tabla `RHH.TPCE`.
 *
 * El script 05 le añade la FK a empresa, el tipo de relación laboral y la duración máxima, que
 * es lo que permite validar los plazos legales de cada modalidad contractual.
 */
export interface TipoContratoEmpleado {
  codigo: number; // TPCECDGO
  empresa?: Empresa | null; // PJRQCDGO
  nombre: string; // TPCENMBR
  requiereFechaFin: string; // TPCERQFF - 'S' / 'N'
  tipoRelacionLaboral?: number | null; // TPCETPRL - rubro 186
  duracionMaximaMeses?: number | null; // TPCEMXMS
  estado: string; // TPCEESTD - 'A' / 'I'
  fechaRegistro: Date; // TPCEFCHR
  usuarioRegistro: string; // TPCEUSRR
}
