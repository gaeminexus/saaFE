import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { ServiciosTsr } from './ws-tsr';

export interface AnticipoRequest {
  idTitular: number;
  valor: number;
  idCuentaBancaria: number;
  /** Cuenta bancaria del proveedor (CTBN) hacia donde se transfiere el anticipo. */
  idCuentaDestinoTitular?: number;
  idEmpresa: number;
  idUsuario: number;
  fechaAnticipo: string;
  numeroDoc: string;
  observacion: string;
}

export interface AnticipoResponse {
  [key: string]: any;
}

/** Cruce del anticipo con una factura, tal como lo devuelve el backend. */
export interface CruceAnticipo {
  idAplicacion: number;
  idFactura?: number;
  numeroFactura?: string;
  montoAplicado: number;
  fechaAplicacion?: any;
  observacion?: string;
}

/**
 * Resultado de `verificarAnulacion` y de un `anular` que quedó pendiente de
 * confirmación. `requiereConfirmacion` es true cuando el anticipo ya fue
 * cruzado con facturas: para anularlo hay que eliminar esos abonos.
 */
export interface VerificacionAnulacionAnticipo {
  anticipo?: number;
  puedeAnular?: boolean;
  requiereConfirmacion?: boolean;
  estado?: number;
  valorAnticipo?: number;
  saldoDisponible?: number;
  montoACruzar?: number;
  cruces?: CruceAnticipo[];
  mensaje?: string;
  advertencia?: string;
  /** Saldo global de anticipos del titular (TSR.PRCC), como contexto. */
  saldoGlobalAnticipos?: number;
  /** Cuántos cruces se eligieron por estimación LIFO en vez de por su FK. */
  crucesEstimados?: number;
  /** Aviso cuando hubo estimación: cruces anteriores a la migración. */
  estimacion?: string;
  exito?: boolean;
  crucesReversados?: number;
}

export interface AnularAnticipoRequest {
  motivo: string;
  idUsuario: number;
  /** true = el usuario aceptó eliminar los abonos que el anticipo hizo a facturas. */
  confirmarReversionCruces: boolean;
}

/** Un anticipo con saldo, tal como lo devuelve /disponibles. */
export interface AnticipoDisponible {
  id: number;
  numeroDoc?: string;
  fechaAnticipo?: any;
  fechaRecepcion?: any;
  valor: number;
  /** Saldo que le queda por cruzar a ESTE anticipo. */
  saldo: number;
  referencia?: string;
  banco?: string;
  observacion?: string;
  estado?: number;
  [key: string]: any;
}

/** Un cruce del anticipo con una factura, con su asiento. */
export interface CruceSeguimiento {
  idAplicacion: number;
  idFactura?: number;
  numeroFactura?: string;
  montoAplicado: number;
  fechaAplicacion?: any;
  fechaRegistro?: any;
  estado?: number;
  estadoDescripcion?: string;
  observacion?: string;
  usuario?: string;
  asiento?: AsientoSeguimiento | null;
}

/** Datos del asiento contable asociados a un anticipo o a un cruce. */
export interface AsientoSeguimiento {
  codigo?: number;
  numero?: number;
  numeroAlterno?: string;
  fechaAsiento?: any;
  estado?: number;
}

/** Un anticipo con todo su historial, para la pantalla de seguimiento. */
export interface AnticipoSeguimiento extends AnticipoDisponible {
  fechaRegistro?: any;
  estadoDescripcion?: string;
  formaPago?: number;
  usuario?: string;
  asiento?: AsientoSeguimiento | null;
  totalCruzado?: number;
  cruces?: CruceSeguimiento[];
}

/**
 * Estado de cuenta de anticipos de un titular. `cuadra` compara la suma de los
 * saldos por anticipo contra el saldo global de la cuenta contable: si da
 * false hay movimientos sin atribuir y viene una `advertencia`.
 */
export interface SeguimientoAnticipos {
  titular?: number;
  empresa?: number;
  anticipos: AnticipoSeguimiento[];
  totalAnticipos: number;
  totalCruzado: number;
  saldoDisponible: number;
  saldoGlobalAnticipos: number;
  diferencia: number;
  cuadra: boolean;
  advertencia?: string;
}

@Injectable({ providedIn: 'root' })
export class AnticipoService {
  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  procesarCliente(payload: AnticipoRequest): Observable<AnticipoResponse> {
    return this.http.post<AnticipoResponse>(`${ServiciosTsr.RS_ANTC}/procesar`, payload, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  procesarProveedor(payload: AnticipoRequest): Observable<AnticipoResponse> {
    return this.http.post<AnticipoResponse>(`${ServiciosTsr.RS_ANTP}/procesar`, payload, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteriaCliente(datos: any[]): Observable<AnticipoResponse[] | null> {
    return this.http.post<AnticipoResponse[]>(`${ServiciosTsr.RS_ANTC}/selectByCriteria/`, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteriaProveedor(datos: any[]): Observable<AnticipoResponse[] | null> {
    return this.http.post<AnticipoResponse[]>(`${ServiciosTsr.RS_ANTP}/selectByCriteria/`, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }


  // ── Anulación de anticipos ──────────────────────────────────────────────
  // El cruce de un anticipo con una factura descuenta el saldo GLOBAL de
  // anticipos del titular, así que antes de anular hay que preguntarle al
  // backend si ese anticipo ya fue cruzado (verificarAnulacion) y, si lo fue,
  // reenviar la anulación con confirmarReversionCruces = true para que
  // elimine esos abonos.

  verificarAnulacionCliente(id: number): Observable<VerificacionAnulacionAnticipo> {
    return this.http.get<VerificacionAnulacionAnticipo>(
      `${ServiciosTsr.RS_ANTC}/verificarAnulacion/${id}`
    ).pipe(catchError(this.handleError));
  }

  verificarAnulacionProveedor(id: number): Observable<VerificacionAnulacionAnticipo> {
    return this.http.get<VerificacionAnulacionAnticipo>(
      `${ServiciosTsr.RS_ANTP}/verificarAnulacion/${id}`
    ).pipe(catchError(this.handleError));
  }

  anularCliente(id: number, payload: AnularAnticipoRequest): Observable<VerificacionAnulacionAnticipo> {
    return this.http.post<VerificacionAnulacionAnticipo>(
      `${ServiciosTsr.RS_ANTC}/anular/${id}`, payload, this.httpOptions
    ).pipe(catchError(this.handleError));
  }

  anularProveedor(id: number, payload: AnularAnticipoRequest): Observable<VerificacionAnulacionAnticipo> {
    return this.http.post<VerificacionAnulacionAnticipo>(
      `${ServiciosTsr.RS_ANTP}/anular/${id}`, payload, this.httpOptions
    ).pipe(catchError(this.handleError));
  }

  // ── Consulta y seguimiento ──────────────────────────────────────────────

  /** Anticipos del cliente con saldo para cruzar (FIFO: del más antiguo al más nuevo). */
  disponiblesCliente(idTitular: number, idEmpresa: number): Observable<AnticipoDisponible[]> {
    return this.http.get<AnticipoDisponible[]>(
      `${ServiciosTsr.RS_ANTC}/disponibles/${idTitular}/${idEmpresa}`
    ).pipe(catchError(this.handleError));
  }

  /** Anticipos del proveedor con saldo para cruzar (FIFO: del más antiguo al más nuevo). */
  disponiblesProveedor(idTitular: number, idEmpresa: number): Observable<AnticipoDisponible[]> {
    return this.http.get<AnticipoDisponible[]>(
      `${ServiciosTsr.RS_ANTP}/disponibles/${idTitular}/${idEmpresa}`
    ).pipe(catchError(this.handleError));
  }

  /** Estado de cuenta de anticipos del cliente: anticipos, cruces, asientos y cuadre. */
  seguimientoCliente(idTitular: number, idEmpresa: number): Observable<SeguimientoAnticipos> {
    return this.http.get<SeguimientoAnticipos>(
      `${ServiciosTsr.RS_ANTC}/seguimiento/${idTitular}/${idEmpresa}`
    ).pipe(catchError(this.handleError));
  }

  /** Estado de cuenta de anticipos del proveedor: anticipos, cruces, asientos y cuadre. */
  seguimientoProveedor(idTitular: number, idEmpresa: number): Observable<SeguimientoAnticipos> {
    return this.http.get<SeguimientoAnticipos>(
      `${ServiciosTsr.RS_ANTP}/seguimiento/${idTitular}/${idEmpresa}`
    ).pipe(catchError(this.handleError));
  }
  private handleError(error: HttpErrorResponse): Observable<never> {
    let mensaje = 'Error al procesar el anticipo';
    if (error.error) {
      if (typeof error.error === 'string') {
        mensaje = error.error;
      } else if (error.error.error) {
        mensaje = error.error.error;
      } else if (error.error.message) {
        mensaje = error.error.message;
      }
    }
    return throwError(() => new Error(mensaje));
  }
}

