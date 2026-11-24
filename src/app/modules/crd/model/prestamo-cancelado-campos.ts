import { PrestamoCanceladoFila } from './prestamo-cancelado';

export type TipoCampoPrestamoCancelado = 'texto' | 'entero' | 'monto';

export type GrupoCampoPrestamoCancelado =
  | 'Identificación'
  | 'Condiciones'
  | 'Cancelación'
  | 'Pagos de toda la vida'
  | 'Operación final'
  | 'Préstamo nuevo';

export interface CampoPrestamoCancelado {
  clave: keyof PrestamoCanceladoFila;
  /** Encabezado del CSV y etiqueta de la pantalla (§5). */
  encabezado: string;
  /** Long → 'entero', Double → 'monto', String → 'texto' (§5). */
  tipo: TipoCampoPrestamoCancelado;
  /** Grupo del diálogo «Ver detalle» (§8). */
  grupo: GrupoCampoPrestamoCancelado;
}

export const GRUPOS_CAMPOS_PRESTAMO_CANCELADO: GrupoCampoPrestamoCancelado[] = [
  'Identificación',
  'Condiciones',
  'Cancelación',
  'Pagos de toda la vida',
  'Operación final',
  'Préstamo nuevo',
];

/** Los 56 campos de §5, en el orden exacto del contrato (el CSV sale en este orden). */
export const CAMPOS_PRESTAMO_CANCELADO: CampoPrestamoCancelado[] = [
  { clave: 'idPrestamo', encabezado: 'Código préstamo', tipo: 'entero', grupo: 'Identificación' },
  { clave: 'numeroOperacion', encabezado: 'N° operación', tipo: 'entero', grupo: 'Identificación' },
  { clave: 'cedula', encabezado: 'Cédula', tipo: 'texto', grupo: 'Identificación' },
  { clave: 'nombreSocio', encabezado: 'Socio', tipo: 'texto', grupo: 'Identificación' },
  { clave: 'filial', encabezado: 'Filial', tipo: 'texto', grupo: 'Identificación' },
  { clave: 'producto', encabezado: 'Producto', tipo: 'texto', grupo: 'Identificación' },
  { clave: 'estadoCodigo', encabezado: 'Código estado', tipo: 'entero', grupo: 'Identificación' },
  { clave: 'estado', encabezado: 'Estado', tipo: 'texto', grupo: 'Identificación' },
  { clave: 'fechaCancelacion', encabezado: 'Fecha cancelación', tipo: 'texto', grupo: 'Cancelación' },
  { clave: 'origenFecha', encabezado: 'Origen de la fecha', tipo: 'texto', grupo: 'Cancelación' },
  { clave: 'forma', encabezado: 'Código forma', tipo: 'texto', grupo: 'Cancelación' },
  { clave: 'formaDescripcion', encabezado: 'Forma de cancelación', tipo: 'texto', grupo: 'Cancelación' },
  { clave: 'canal', encabezado: 'Origen del dinero', tipo: 'texto', grupo: 'Cancelación' },
  { clave: 'fechaOtorgamiento', encabezado: 'Fecha otorgamiento', tipo: 'texto', grupo: 'Condiciones' },
  { clave: 'fechaInicio', encabezado: 'Fecha inicio', tipo: 'texto', grupo: 'Condiciones' },
  { clave: 'fechaFinPlazo', encabezado: 'Fin del plazo', tipo: 'texto', grupo: 'Condiciones' },
  { clave: 'plazo', encabezado: 'Plazo (meses)', tipo: 'entero', grupo: 'Condiciones' },
  { clave: 'tasa', encabezado: 'Tasa', tipo: 'monto', grupo: 'Condiciones' },
  { clave: 'valorCuota', encabezado: 'Valor cuota', tipo: 'monto', grupo: 'Condiciones' },
  { clave: 'montoSolicitado', encabezado: 'Monto otorgado', tipo: 'monto', grupo: 'Condiciones' },
  { clave: 'montoLiquido', encabezado: 'Monto líquido', tipo: 'monto', grupo: 'Condiciones' },
  { clave: 'cuotasPagadas', encabezado: 'Cuotas pagadas', tipo: 'entero', grupo: 'Condiciones' },
  { clave: 'cuotasCanceladasAnticipadas', encabezado: 'Cuotas canceladas anticipadas', tipo: 'entero', grupo: 'Condiciones' },
  { clave: 'ultimaCuotaPagada', encabezado: 'Última cuota pagada', tipo: 'entero', grupo: 'Condiciones' },
  { clave: 'numeroPagos', encabezado: 'N° de pagos', tipo: 'entero', grupo: 'Pagos de toda la vida' },
  { clave: 'fechaPrimerPago', encabezado: 'Primer pago', tipo: 'texto', grupo: 'Pagos de toda la vida' },
  { clave: 'fechaUltimoPago', encabezado: 'Último pago', tipo: 'texto', grupo: 'Pagos de toda la vida' },
  { clave: 'totalCapitalPagado', encabezado: 'Capital pagado', tipo: 'monto', grupo: 'Pagos de toda la vida' },
  { clave: 'totalInteresPagado', encabezado: 'Interés pagado', tipo: 'monto', grupo: 'Pagos de toda la vida' },
  { clave: 'totalMoraPagada', encabezado: 'Mora pagada', tipo: 'monto', grupo: 'Pagos de toda la vida' },
  { clave: 'totalInteresVencidoPagado', encabezado: 'Interés vencido pagado', tipo: 'monto', grupo: 'Pagos de toda la vida' },
  { clave: 'totalDesgravamenPagado', encabezado: 'Desgravamen pagado', tipo: 'monto', grupo: 'Pagos de toda la vida' },
  { clave: 'totalSeguroIncendioPagado', encabezado: 'Seguro incendio pagado', tipo: 'monto', grupo: 'Pagos de toda la vida' },
  { clave: 'totalSaldoOtrosPagado', encabezado: 'Saldo otros pagado', tipo: 'monto', grupo: 'Pagos de toda la vida' },
  { clave: 'totalPagado', encabezado: 'Total pagado', tipo: 'monto', grupo: 'Pagos de toda la vida' },
  { clave: 'totalAportesUsados', encabezado: 'Aportes usados', tipo: 'monto', grupo: 'Pagos de toda la vida' },
  { clave: 'totalAportesGarante', encabezado: 'Aportes del garante', tipo: 'monto', grupo: 'Pagos de toda la vida' },
  { clave: 'tieneMigracion', encabezado: 'Con pagos de migración', tipo: 'texto', grupo: 'Pagos de toda la vida' },
  { clave: 'tipoOperacionFinal', encabezado: 'Operación final', tipo: 'texto', grupo: 'Operación final' },
  { clave: 'fechaOperacionFinal', encabezado: 'Fecha operación final', tipo: 'texto', grupo: 'Operación final' },
  { clave: 'valorOperacionFinal', encabezado: 'Valor operación final', tipo: 'monto', grupo: 'Operación final' },
  { clave: 'efectivoOperacionFinal', encabezado: 'Efectivo operación final', tipo: 'monto', grupo: 'Operación final' },
  { clave: 'aportesOperacionFinal', encabezado: 'Aportes operación final', tipo: 'monto', grupo: 'Operación final' },
  { clave: 'aportesGaranteOperacionFinal', encabezado: 'Aportes garante operación final', tipo: 'monto', grupo: 'Operación final' },
  { clave: 'valorCondonado', encabezado: 'Valor condonado', tipo: 'monto', grupo: 'Operación final' },
  { clave: 'usuarioOperacionFinal', encabezado: 'Usuario', tipo: 'texto', grupo: 'Operación final' },
  { clave: 'idEvento', encabezado: 'Evento', tipo: 'entero', grupo: 'Operación final' },
  { clave: 'idCobro', encabezado: 'Cobro', tipo: 'entero', grupo: 'Operación final' },
  { clave: 'idCargaArchivo', encabezado: 'Carga Petro/ARCH', tipo: 'entero', grupo: 'Operación final' },
  { clave: 'idAsiento', encabezado: 'Asiento', tipo: 'entero', grupo: 'Operación final' },
  { clave: 'idPrestamoNuevo', encabezado: 'Código préstamo nuevo', tipo: 'entero', grupo: 'Préstamo nuevo' },
  { clave: 'numeroOperacionNuevo', encabezado: 'N° operación nuevo', tipo: 'entero', grupo: 'Préstamo nuevo' },
  { clave: 'montoPrestamoNuevo', encabezado: 'Monto préstamo nuevo', tipo: 'monto', grupo: 'Préstamo nuevo' },
  { clave: 'valorSustitucion', encabezado: 'Valor de sustitución', tipo: 'monto', grupo: 'Préstamo nuevo' },
  { clave: 'observacionOperacionFinal', encabezado: 'Observación', tipo: 'texto', grupo: 'Operación final' },
  { clave: 'observacionReporte', encabezado: 'Advertencia', tipo: 'texto', grupo: 'Cancelación' },
];
