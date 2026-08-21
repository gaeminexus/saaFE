import { Empleado } from './empleado';
import { TipoContratoEmpleado } from './tipo-contrato-empleado';

/**
 * Contrato del colaborador. Tabla `RHH.CNTE`.
 *
 * El script 05 le añade lo que el motor de nómina necesita para saber cómo calcular a cada
 * persona: relación laboral, jornada, y las modalidades de décimos y fondos de reserva, que son
 * una elección del trabajador y cambian si el beneficio se mensualiza o se acumula.
 */
export interface ContratoEmpleado {
  codigo: number; // CNTECDGO
  empleado: Empleado; // MPLDCDGO
  tipoContratoEmpleado: TipoContratoEmpleado; // TPCECDGO
  numero: string; // CNTENMRO
  fechaInicio: Date; // CNTEFCHI
  fechaFin: Date; // CNTEFCHF
  salarioBase: number; // CNTESLRB
  fechaFirma: Date; // CNTEFCFR
  observacion: string; // CNTEOBSR

  // Régimen laboral
  tipoRelacionLaboral?: number | null; // CNTETPRL - rubro 186
  jornada?: number | null; // CNTEJRND - rubro 210
  horasSemanales?: number | null; // CNTEHRSM
  valorHora?: number | null; // CNTEVLHR - contratos por horas

  // Modalidades de beneficios sociales, a elección del trabajador
  modalidadDecimoTercero?: number | null; // CNTEDCTM - rubro 188
  modalidadDecimoCuarto?: number | null; // CNTEDCCM - rubro 189
  modalidadFondosReserva?: number | null; // CNTEFRMD - rubro 190
  derechoDecimoCuarto?: string | null; // CNTEDCMS - 'S' / 'N'

  // Aportación y retención
  aportaIess?: string | null; // CNTEAPRT - 'S' / 'N'; 'N' en servicios profesionales
  retieneFuente?: string | null; // CNTERTFN - 'S' / 'N'
  porcentajeRetencionFuente?: number | null; // CNTEPRRF

  // Datos para las salidas oficiales y la asignación operativa
  ocupacionMdt?: string | null; // CNTEOCUP - código de ocupación sectorial
  causalTerminacion?: { codigo: number } | null; // CNTECSTR
  fechaTerminacion?: Date | null; // CNTEFCTR
  centroCosto?: { codigo: number } | null; // CNTECNCS
  turno?: { codigo: number } | null; // CNTETRNO

  estado: string; // CNTEESTD
  fechaRegistro: Date; // CNTEFCHR
  usuarioRegistro: string; // CNTEUSRR
}
