import { Empresa } from '../../../shared/model/empresa';

/**
 * Catálogo de conceptos de nómina. Tabla `RHH.CPNM`.
 *
 * Es la pieza que convierte la nómina en un motor configurable: cada ingreso, descuento, aporte
 * patronal y provisión es una fila aquí, y el rol de pago se construye recorriéndolas.
 */
export interface ConceptoNomina {
  codigo: number; // CPNMCDGO
  empresa: Empresa | null; // PJRQCDGO
  nombre: string; // CPNMNMBR
  abreviatura: string | null; // CPNMABRV - abreviatura para el rol de pago
  codigoAlterno: number; // CPNMALTR - código estable del concepto
  rolMotor: number | null; // CPNMROLM - rubro 221; nulo = concepto ordinario, sin rol en el motor
  tipoConcepto: number; // CPNMTPCN - rubro 179
  tipoCalculo: number; // CPNMTPCL - rubro 180
  baseCalculo: number | null; // CPNMBSCL - rubro 181
  tipoRelacionLaboral: number | null; // CPNMTPRL - rubro 186; nulo = todas
  valor: number | null; // CPNMVLRR - valor fijo
  porcentaje: number | null; // CPNMPRCN
  formula: string | null; // CPNMFRML
  imponibleIess: string; // CPNMIMIE - 'S' / 'N'
  imponibleIr: string; // CPNMIMIR - 'S' / 'N'
  aportaFondosReserva: string; // CPNMAPFR - 'S' / 'N'
  baseDecimoTercero: string; // CPNMBSDT - 'S' / 'N'
  baseDecimoCuarto: string; // CPNMBSDC - 'S' / 'N'
  baseVacaciones: string; // CPNMBSVC - 'S' / 'N'
  baseUtilidades: string; // CPNMBSUT - 'S' / 'N'
  patronal: string; // CPNMPTRN - 'S' / 'N', no afecta el neto
  provision: string; // CPNMPRVS - 'S' / 'N'
  obligatorio: string; // CPNMOBLG - 'S' / 'N', se aplica a todo contrato vigente
  recortable: string; // CPNMRCRT - 'S' / 'N'; los descuentos de ley van en 'N'
  casilleroRdep: string | null; // CPNMRDEP - casillero del anexo RDEP
  codigoIess: string | null; // CPNMIESS - código en la planilla del IESS
  casilleroF107: string | null; // CPNMF107 - casillero del formulario 107
  planCuenta: { codigo: number } | null; // PLNNCDGO - cuenta propia del concepto
  detallePlantilla: { codigo: number } | null; // DTPLCDGO - línea de plantilla contable
  orden: number | null; // CPNMORDN - presentación y prelación ante neto negativo
  estado: number; // CPNMESTD
  fechaRegistro?: Date; // CPNMFCHR
  usuarioRegistro?: string; // CPNMUSRR
}
