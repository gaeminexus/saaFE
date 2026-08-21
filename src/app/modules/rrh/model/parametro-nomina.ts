import { Empresa } from '../../../shared/model/empresa';

/**
 * Parámetros normativos por año. Tabla `RHH.PRNM`.
 *
 * Aquí vive todo lo que cambia cada enero (SBU, canasta, tasas del IESS, recargos, topes). Un
 * cambio de normativa es un registro nuevo de este año, nunca un cambio de código.
 * Único por empresa y año.
 */
export interface ParametroNomina {
  codigo: number; // PRNMCDGO
  empresa: Empresa | null; // PJRQCDGO
  anio: number; // PRNMANOO

  // Valores base
  sbu: number; // PRNMSBUU - Salario Básico Unificado del año
  canastaBasica: number | null; // PRNMCNBS - canasta familiar básica de enero

  // IESS
  aportePersonal: number | null; // PRNMAPPR - %
  aportePatronal: number | null; // PRNMAPPT - %
  iece: number | null; // PRNMIECE - %
  secap: number | null; // PRNMSCAP - %
  fondosReserva: number | null; // PRNMFNRS - %

  // Impuesto a la renta
  porcentajeGastosPersonales: number | null; // PRNMTPGP - % de rebaja sobre gastos declarados
  canastasCatastrofica: number | null; // PRNMCNCT - canastas de tope en enfermedad catastrófica

  // Utilidades
  utilidadPorcentaje: number | null; // PRNMUTPR - % total a repartir
  utilidadDias: number | null; // PRNMUTDI - % que se reparte por días trabajados
  utilidadCargas: number | null; // PRNMUTCG - % que se reparte por cargas familiares
  utilidadTopeSbu: number | null; // PRNMUTSB - tope por trabajador, en número de SBU

  // Bases de cálculo
  diasMes: number | null; // PRNMDIAS - días base del mes comercial
  diasAnio: number | null; // PRNMDANO - días base del año comercial
  horasMes: number | null; // PRNMHRMS - horas base del mes
  horasDia: number | null; // PRNMHRDI - horas de la jornada ordinaria diaria

  // Horas extra
  recargoSuplementaria: number | null; // PRNMRCSP - %
  recargoExtraordinaria: number | null; // PRNMRCEX - %
  recargoNocturno: number | null; // PRNMRCNC - %
  maxHorasDia: number | null; // PRNMHRMX
  maxHorasSemana: number | null; // PRNMHRSX

  // Vacaciones
  diasVacaciones: number | null; // PRNMDIVC - días por año cumplido
  anioVacacionAdicional: number | null; // PRNMANVC - año desde el que se suma un día
  maxDiasVacaciones: number | null; // PRNMMXVC - tope de días acreditables
  aniosCaducidadVacaciones: number | null; // PRNMCDVC - años tras los que caduca el saldo

  // Indemnizaciones
  porcentajeDesahucio: number | null; // PRNMDSPR - % de la última remuneración por año
  indemnizacionMinima: number | null; // PRNMDIMN - remuneraciones mínimas por despido
  indemnizacionMaxima: number | null; // PRNMDIMX - remuneraciones máximas por despido
  aniosIndemnizacionMinima: number | null; // PRNMDIAN - antigüedad bajo la que aplica el mínimo

  estado: number; // PRNMESTD
  fechaRegistro?: Date; // PRNMFCHR
  usuarioRegistro?: string; // PRNMUSRR
}
