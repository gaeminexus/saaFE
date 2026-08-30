import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { MovimientoRelacionado } from '../../../../shared/model/pagos-cobros/movimiento-relacionado';
import { LiquidacionEmitir } from '../../model/liquidacion-emitir';
import { DetalleLiquidacionEmitir } from '../../model/detalle-liquidacion-emitir';
import { FormaPagoLiquidacion } from '../../model/forma-pago-liquidacion';
import { ServiciosCxc } from '../ws-cxc';

/** Body de POST /lqcs/procesarCompleta. */
export interface ProcesarLiquidacionCompletaRequest {
  liquidacionCompra: Partial<LiquidacionEmitir>;
  detalles: Partial<DetalleLiquidacionEmitir>[];
  /** Opcional: si no viene, el backend usa "01" (sin utilización del sistema financiero) por el total. */
  formasPago?: Partial<FormaPagoLiquidacion>[];
}

/**
 * Resultado de /lqcs/procesarCompleta y de los endpoints de recuperación.
 * `etapa` indica dónde se detuvo o completó el proceso — ver
 * docs/logica-negocio/cxc/LIQUIDACION-COMPRA-EMISION.md §4/§6 en saaBE.
 */
export interface ResultadoProcesoLiquidacion {
  exito: boolean;
  estado?: string;
  /**
   * COMPLETADO | COMPLETADO_CON_PENDIENTES | VALIDACION_CONTABLE | PARAMETROS |
   * WS1_RECEPCION | WS2_AUTORIZACION | GENERACION_XML | GRABADO_LIQUIDACION |
   * GRABADO_DETALLES | GRABADO_FORMA_PAGO | ERROR_INESPERADO | ...
   */
  etapa?: string;
  mensaje?: string;
  error?: string;
  /** Solo en fallo de VALIDACION_CONTABLE; incluye entradas "PRODUCTOS_SIN_CLASIFICAR: ..." si aplica. */
  erroresContables?: string[];
  clave?: string;
  idLiquidacion?: number;
  autorizacion?: string;
  /** Id del documento CXP (PGS.LQCC) creado al autorizarse. */
  documentoCxp?: number | null;
  /** Número alterno del asiento contable generado sobre el documento CXP. */
  asiento?: string | null;
  emailEnviado?: boolean;
  contabilidadPendiente?: boolean;
  /** Presente cuando `crearDocumentoCxp` falló dentro de procesarCompleta (etapa queda COMPLETADO_CON_PENDIENTES). */
  advertenciaAsiento?: string;
  advertenciaEmail?: string;
  liquidacion?: LiquidacionEmitir;
  [key: string]: unknown;
}

/**
 * `LiquidacionCompra` (cxc, esta liquidación EMITIDA) sí cascadea — a diferencia de
 * `LiquidacionCompraCompra` (cxp, la RECIBIDA de un proveedor), que no tiene nada que
 * cascadear. Mismo nombre parecido, comportamiento opuesto — no confundir al rutear.
 */
export interface AnularLiquidacionRequest {
  idLiquidacion: number;
  motivo: string;
  usuario: string;
  idUsuario: number;
  anularEnCascada: boolean;
}

export interface ReenviarEmailLiquidacionRequest {
  idLiquidacion: number;
  destinatarios: string;
}

@Injectable({ providedIn: 'root' })
export class LiquidacionEmitirService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<LiquidacionEmitir[] | null> {
    return this.http
      .get<LiquidacionEmitir[]>(`${ServiciosCxc.RS_LQCS}/getAll`)
      .pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<LiquidacionEmitir | null> {
    return this.http
      .get<LiquidacionEmitir>(`${ServiciosCxc.RS_LQCS}/getId/${id}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Endpoint principal: valida cuentas contables, emite ante el SRI, crea el
   * documento CXP (cuenta por pagar) y envía el email — todo en una llamada.
   * Reemplaza al inexistente `grabarLiquidacion` (POST /lqcs/grabarLiquidacion
   * nunca existió en el backend).
   */
  procesarCompleta(datos: ProcesarLiquidacionCompletaRequest): Observable<ResultadoProcesoLiquidacion> {
    return this.http.post<ResultadoProcesoLiquidacion>(
      `${ServiciosCxc.RS_LQCS}/procesarCompleta`, datos, this.httpOptions
    );
    // Sin catchError: los códigos 422/500 también traen un body ResultadoProcesoLiquidacion
    // útil (etapa, mensaje, erroresContables) que el componente necesita leer del error.
  }

  update(datos: Partial<LiquidacionEmitir>): Observable<LiquidacionEmitir | null> {
    return this.http
      .put<LiquidacionEmitir>(ServiciosCxc.RS_LQCS, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<LiquidacionEmitir[] | null> {
    return this.http
      .post<LiquidacionEmitir[]>(`${ServiciosCxc.RS_LQCS}/selectByCriteria/`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<LiquidacionEmitir | null> {
    return this.http
      .delete<LiquidacionEmitir>(`${ServiciosCxc.RS_LQCS}/${id}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** Reintenta solo la consulta de autorización (WS2) de una liquidación RECIBIDA/ENVIADA sin autorizar. */
  reintentarAutorizacion(id: number): Observable<ResultadoProcesoLiquidacion> {
    return this.http.post<ResultadoProcesoLiquidacion>(
      `${ServiciosCxc.RS_LQCS}/reintentarAutorizacion/${id}`, {}, this.httpOptions
    );
  }

  /** Punto de recuperación general: consulta el SRI y completa lo que falte (estado, documento CXP, email). Idempotente. */
  consultarYActualizarEstado(id: number): Observable<ResultadoProcesoLiquidacion> {
    return this.http.get<ResultadoProcesoLiquidacion>(
      `${ServiciosCxc.RS_LQCS}/consultarYActualizarEstado/${id}`
    );
  }

  /** Reenvía el RIDE + XML autorizado. `destinatarios` separados por ";". */
  reenviarEmail(datos: ReenviarEmailLiquidacionRequest): Observable<ResultadoProcesoLiquidacion> {
    return this.http.post<ResultadoProcesoLiquidacion>(
      `${ServiciosCxc.RS_LQCS}/reenviarEmail`, datos, this.httpOptions
    );
  }

  /** Reintenta solo la creación del documento CXP / asiento. Idempotente. */
  crearDocumentoCxp(id: number): Observable<ResultadoProcesoLiquidacion> {
    return this.http.post<ResultadoProcesoLiquidacion>(
      `${ServiciosCxc.RS_LQCS}/crearDocumentoCxp/${id}`, {}, this.httpOptions
    );
  }

  /** Body: {idLiquidacion, motivo, usuario, idUsuario, anularEnCascada} — NO /anular/{id}. */
  anular(datos: AnularLiquidacionRequest): Observable<ResultadoProcesoLiquidacion> {
    return this.http.post<ResultadoProcesoLiquidacion>(
      `${ServiciosCxc.RS_LQCS}/anular`, datos, this.httpOptions
    );
    // Sin catchError, igual que procesarCompleta: el 409/400 también trae un body útil
    // (mensaje) que el componente lee directo del HttpErrorResponse.
  }

  /** Cobros/notas/retenciones cruzados con esta liquidación — consultar antes de anular (ítem 14). */
  movimientosRelacionados(id: number): Observable<MovimientoRelacionado[]> {
    return this.http.get<MovimientoRelacionado[]>(
      `${ServiciosCxc.RS_LQCS}/movimientosRelacionados/${id}`
    );
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}
