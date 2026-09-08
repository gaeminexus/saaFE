import { CuentaBancaria } from '../../tsr/model/cuenta-bancaria';

/**
 * Devolución (total o parcial) de un anticipo a empleado: el colaborador deposita la plata en una
 * cuenta de la empresa en vez de que se le siga descontando del rol (`RHH.DVAN`, backend
 * `com.saa.model.rhh.DevolucionAnticipo`). Ver `docs/rrh/API-DEVOLUCION-ANTICIPO.md`.
 *
 * Puede haber varias devoluciones, totales o parciales, sobre el mismo anticipo — por eso es una
 * tabla propia y no columnas en `AnticipoTrabajador`.
 */
export interface DevolucionAnticipo {
  codigo: number;
  anticipo?: { codigo: number } | null;
  /** Fecha real del depósito, no la de captura. */
  fecha: any;
  valor: number;
  /**
   * `@ManyToOne` sin `FetchType.LAZY` en el backend (igual que `CuentaBancaria.banco`): al leer
   * viene el objeto completo, no sólo el código — se necesita para mostrar banco/número en el
   * listado. Al escribir (`registrar`) sólo se manda `idCuentaBancaria` como escalar plano.
   */
  cuentaBancaria?: CuentaBancaria | null;
  /** N.° de papeleta o de transferencia. */
  referencia: string | null;
  observacion: string | null;
  /** El `TSR.INGR` generado — id crudo, no relación (ver el modelo del backend). */
  idIngreso?: number | null;
  asiento?: { codigo: number } | null;
  /** Ver `EstadoDevolucionAnticipo`: 1 Vigente · 2 Anulada. */
  estado: number;
  motivoAnulacion?: string | null;
  fechaRegistro?: any;
  usuario?: number | null;
}

/** Estado de `RHH.DVAN.DVANESTD` — no es un rubro catalogado, es un flag simple. */
export enum EstadoDevolucionAnticipo {
  VIGENTE = 1,
  ANULADA = 2,
}

/** Cuerpo de `POST /dvan/registrar`. */
export interface RegistrarDevolucionAnticipoRequest {
  idAnticipo: number;
  /** yyyy-MM-dd — la fecha real del depósito, no la de hoy. */
  fecha: string;
  valor: number;
  idCuentaBancaria: number;
  referencia?: string | null;
  observacion?: string | null;
  idUsuario: number;
}

/** Una cuota afectada: la que quedó cancelada entera, o la que bajó de valor. */
export interface CuotaAfectadaDevolucion {
  numero: number;
  vencimiento: any;
  /** Presente en `cuotasCanceladas`: el valor de la cuota que se canceló entera. */
  valor?: number;
  /** Presente sólo en `cuotaAjustada`: el valor que le quedó tras bajar por el resto de la devolución. */
  valorNuevo?: number;
}

/** Respuesta de `POST /dvan/registrar` (`docs/rrh/API-DEVOLUCION-ANTICIPO.md` §5.1). */
export interface RegistrarDevolucionAnticipoResponse {
  idDevolucion: number;
  idAnticipo: number;
  valor: number;
  saldoAnterior: number;
  saldoNuevo: number;
  /** Ver `EstadoAnticipo` de `anticipo-trabajador.ts` — puede haber pasado a CANCELADO. */
  estadoAnticipo: number;
  /** Cuotas que quedaron canceladas enteras por esta devolución. Puede venir vacía. */
  cuotasCanceladas: CuotaAfectadaDevolucion[];
  /** La cuota que bajó de valor por el resto, o `null` si no hubo resto. Sigue PENDIENTE, no PARCIAL. */
  cuotaAjustada: CuotaAfectadaDevolucion | null;
  idIngreso: number;
  idAsiento?: number | null;
  numeroAsiento?: string | number | null;
  /**
   * `null` cuando no aplica. Cuando viene, el período de la cuota anulada ya está calculado: anular
   * la cuota no cambia ese rol, así que el descuento sale igual este mes si no se recalcula. No es
   * un error — es información que el usuario necesita y que nadie más le va a dar.
   */
  avisoPeriodoCalculado: string | null;
  mensaje: string;
}
