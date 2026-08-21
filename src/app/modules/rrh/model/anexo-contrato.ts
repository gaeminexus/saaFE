import { ContratoEmpleado } from './contrato-empleado';

/**
 * Adenda de un contrato. Tabla `RHH.NXOO`.
 *
 * **La propiedad se llama `contrato`, no `contratoEmpleado`.** El campo Java sí se llama
 * `contratoEmpleado`, pero sus accesores son `getContrato`/`setContrato` y Jackson deriva el
 * nombre del accesor. Verificado contra el desplegado el 2026-08-20: enviar `contratoEmpleado`
 * devuelve 400 «Not able to deserialize data provided», y sin la guarda de propiedades
 * desconocidas la adenda se habría guardado huérfana de contrato.
 *
 * Dos particularidades más de esta tabla, contra la convención del resto del módulo:
 * `NXOOFCHR` es `LocalDate` —no `LocalDateTime`—, así que la fecha de registro viaja como
 * `yyyy-MM-dd`; y `tipo` tiene un CHECK que solo admite `ADENDUM`, `ANEXO` y `RENOVACION`.
 */
export interface AnexoContrato {
  codigo: number; // NXOOCDGO
  contrato: ContratoEmpleado | { codigo: number }; // CNTECDGO - ojo con el nombre
  tipo: TipoAnexoContrato; // NXOOTPOO - CHECK, no rubro
  fechaAnexo: Date; // NXOOFCHA - fecha de vigencia de la adenda
  detalle?: string | null; // NXOODTLL
  nuevoSalario?: number | null; // NXOOSLRN
  nuevaFechaFin?: Date | null; // NXOOFCHF
  fechaRegistro?: Date; // NXOOFCHR - LocalDate
  usuarioRegistro?: string; // NXOOUSRR
}

/** Los tres valores que admite el CHECK `CK_NXOOTPOO`. */
export type TipoAnexoContrato = 'ADENDUM' | 'ANEXO' | 'RENOVACION';
