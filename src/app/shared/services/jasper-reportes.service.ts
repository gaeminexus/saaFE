import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

interface ReporteRequest {
  modulo: string;
  nombreReporte: string;
  formato?: string;
  parametros?: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class JasperReportesService {
  // '/SaaBE/rest' -> usar /rprt (mismo patrón que otros servicios)
  private readonly api = `${environment.apiUrl}/rprt`;

  constructor(private http: HttpClient) {}

  /**
   * Genera un reporte Jasper
   * @param modulo Código del módulo (cnt, tsr, crd, cxc, cxp, rhh)
   * @param nombreReporte Nombre del archivo jrxml sin extensión
   * @param parametros Parámetros del reporte
   * @param formato Formato del reporte (PDF, EXCEL, HTML). Default: PDF
   */
  generar(
    modulo: string,
    nombreReporte: string,
    parametros?: Record<string, any>,
    formato: string = 'PDF'
  ): Observable<Blob> {
    const request: ReporteRequest = {
      modulo,
      nombreReporte,
      formato,
      parametros: parametros || {}
    };

    return this.http.post(`${this.api}/generar`, request, {
      responseType: 'blob'
    });
  }
}
