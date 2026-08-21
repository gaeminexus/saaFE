import { Empleado } from './empleado';

/**
 * Resumen diario de asistencia. Tabla `RHH.RSMN`.
 *
 * Una fila por colaborador y día, consolidada a partir de las marcaciones. Es de donde salen los
 * días trabajados del período y las horas extra tipificadas.
 *
 * El script 05 separa lo que antes era un único `minutosExtra` en las tres figuras que
 * distingue el Código del Trabajo —suplementarias al 50 %, extraordinarias al 100 % y recargo
 * nocturno del 25 %— y añade las horas de entrada y salida como `TIMESTAMP` en lugar del texto
 * original, que impedía calcular nada.
 *
 * `inconsistente` la marca la consolidación cuando el día no cuadra: una entrada sin salida, dos
 * entradas seguidas, una salida anterior a la entrada. Son las que hay que revisar a mano.
 */
export interface ResumenNomina {
  codigo: number; // RSMNCDGO
  empleado: Empleado | { codigo: number } | null; // MPLDCDGO
  fecha: Date; // RSMNFCHA

  // Horas de la jornada. Las de texto son las originales; las reales son las del script 05
  horaEntrada?: string | null; // RSMNENTR - texto original
  horaSalida?: string | null; // RSMNSLDA - texto original
  entradaReal?: Date | null; // RSMNENTT
  salidaReal?: Date | null; // RSMNSLDT

  // Desviaciones respecto del turno
  minutosTarde: number; // RSMNTRDE
  minutosSalidaAnticipada?: number; // RSMNSLAN

  // Horas del día, tipificadas
  horasTrabajadas?: number; // RSMNHRTR - descontado el almuerzo
  horasSuplementarias?: number; // RSMNHRSP - recargo del 50 %
  horasExtraordinarias?: number; // RSMNHREX - recargo del 100 %
  horasNocturnas?: number; // RSMNHRNC - jornada ordinaria en horario nocturno

  // Ausencia y revisión
  ausencia: string; // RSMNASNT - 'S' / 'N', si el día es una ausencia. No confundir con tipoAusencia
  tipoAusencia?: number | null; // RSMNTPAS - rubro 207
  justificado: string; // RSMNJSTF - 'S' / 'N'
  inconsistente?: string; // RSMNINCN - 'S' / 'N', requiere revisión manual
  procesado?: string; // RSMNPRCS - 'S' / 'N', ya consumido por un período cerrado
  justificacion?: string | null; // RSMNJSTC - justificación de la corrección manual

  fuente: number; // RSMNFNTE - rubro 193, igual que el origen de la marcación
  fechaRegistro?: Date;
  usuarioRegistro?: string;
}
