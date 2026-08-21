import { Empresa } from '../../../shared/model/empresa';

/**
 * Tope de gastos personales deducibles según cargas familiares. Tabla `RHH.TPGP`.
 *
 * El tope en dólares es `numeroCanastas * canastaBasica` del año, y la rebaja del impuesto es
 * ese tope por el porcentaje de `RHH.PRNM`. Ni las canastas ni el porcentaje se escriben en
 * código. El registro con más cargas aplica de ese número en adelante.
 */
export interface TopeGastoPersonal {
  codigo: number; // TPGPCDGO
  empresa: Empresa | null; // PJRQCDGO
  anio: number; // TPGPANOO
  numeroCargas: number; // TPGPNCRG
  numeroCanastas: number; // TPGPNCAN
  estado: number; // TPGPESTD
  fechaRegistro?: Date; // TPGPFCHR
  usuarioRegistro?: string; // TPGPUSRR
}
