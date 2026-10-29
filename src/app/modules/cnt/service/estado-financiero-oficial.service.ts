import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Cuerpo de `/esfo/*` (saaBE C19, `SolicitudEstadoFinanciero`). */
export interface SolicitudEstadoFinanciero {
  empresa: number;
  codigoAlterno: number;
  fechaInicio?: string | null;
  fechaFin: string;
  /** 0 por periodo, 1 acumulado (saldo a la fecha de corte). */
  acumulacion?: number;
  nivelMaximo?: number;
  eliminarSaldosCero?: boolean;
  mostrarSaldoAnterior?: boolean;
  mostrarNivel?: boolean;
  /** NINGUNO | MES_ANTERIOR | CIERRE_ANIO_ANTERIOR | MISMO_MES_ANIO_ANTERIOR */
  comparativo?: string;
  notas?: string | null;
  /** PDF | EXCEL */
  formato?: string;
  usuario?: string;
}

/** Respuesta de `/esfo/encabezado`. */
export interface EncabezadoEstadoFinanciero {
  razonSocial: string;
  ruc: string | null;
  titulo: string;
  periodo: string;
  moneda: string;
  /** PRELIMINAR | DEFINITIVO */
  leyenda: string;
  estadoPeriodo: string;
  nombreArchivo: string;
}

/**
 * Estados financieros oficiales (C19): PDF/Excel con logo, encabezado institucional, nombre propio de cada
 * estado, Resultado del Ejercicio, comparativo y leyenda PRELIMINAR/DEFINITIVO. Ver
 * saaBE docs/logica-negocio/rpr/ESTADOS-FINANCIEROS-OFICIALES.md.
 */
@Injectable({ providedIn: 'root' })
export class EstadoFinancieroOficialService {
  private readonly api = `${environment.apiUrl}/esfo`;

  constructor(private http: HttpClient) {}

  encabezado(s: SolicitudEstadoFinanciero): Observable<EncabezadoEstadoFinanciero> {
    return this.http.post<EncabezadoEstadoFinanciero>(`${this.api}/encabezado`, s);
  }

  /** El archivo con el nombre que manda el backend (Content-Disposition). */
  imprimir(s: SolicitudEstadoFinanciero): Observable<HttpResponse<Blob>> {
    return this.http.post(`${this.api}/imprimir`, s, { responseType: 'blob', observe: 'response' });
  }
}

/** Nombre de archivo del encabezado Content-Disposition, o el alternativo. */
export function nombreDeArchivo(resp: HttpResponse<Blob>, alternativo: string): string {
  const cd = resp.headers.get('Content-Disposition') ?? '';
  const m = /filename="?([^";]+)"?/i.exec(cd);
  return m ? m[1] : alternativo;
}
