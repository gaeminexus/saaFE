import { Empresa } from '../../../shared/model/empresa';

/**
 * Maestro de personal. Tabla `RHH.MPLD`.
 *
 * El script 05 amplía la tabla original de 8 campos con todo lo que exige la normativa: FK a
 * empresa, datos de identidad, discapacidad y CONADIS, afiliación al IESS, región del décimo
 * cuarto y contacto de emergencia.
 */
export interface Empleado {
  codigo: number; // MPLDCDGO
  empresa?: Empresa | null; // PJRQCDGO

  // Identificación
  tipoIdentificacion?: number | null; // MPLDTPID - rubro TipoIdentificacion
  identificacion: string | number; // MPLDIDNT
  apellidos: string; // MPLDAPLL
  nombres: string; // MPLDNMBR
  fechaNacimiento: Date; // MPLDFCHN
  estadoCivil?: number | null; // MPLDESTC - rubro 219
  genero?: number | null; // MPLDGNRO - rubro 218
  nacionalidad?: string | null; // MPLDNCNL
  nivelInstruccion?: number | null; // MPLDNVIN - rubro 220
  profesion?: string | null; // MPLDPRFS
  tipoSangre?: string | null; // MPLDTPSN

  // Condiciones que afectan al cálculo del impuesto y a la cuota MDT
  discapacidad?: string | null; // MPLDDSCP - 'S' / 'N'
  porcentajeDiscapacidad?: number | null; // MPLDPRDS
  carneConadis?: string | null; // MPLDCNDS
  enfermedadCatastrofica?: string | null; // MPLDCTSF - 'S' / 'N'

  // Relación con la empresa
  codigoAfiliacion?: string | null; // MPLDCDAF - código de afiliación al IESS
  fechaIngreso?: Date | null; // MPLDFCIN
  region?: number | null; // MPLDRGNN - rubro 187, determina el período del décimo cuarto
  codigoBiometrico?: string | null; // MPLDCDBM
  centroCosto?: { codigo: number } | null; // MPLDCNCS - FK a CNT.CNCS

  // Contacto
  email: string; // MPLDMAIL
  telefono: string; // MPLDTLFN
  direccion: string; // MPLDDRCC
  contactoEmergencia?: string | null; // MPLDCTEM
  telefonoEmergencia?: string | null; // MPLDTLEM
  foto?: string | null; // MPLDFOTO

  estado: string; // MPLDESTD
  fechaRegistro: Date; // MPLDFCHR
  usuarioRegistro: string; // MPLDUSRR
}
