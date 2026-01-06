import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class JasperReportesService {
  // '/SaaBE/rest'  -> queremos '/SaaBE/api/reportes'
  private readonly api = `${environment.apiUrl.replace('/rest', '')}/api/reportes`;

  constructor(private http: HttpClient) {}

  generar(reporte: string, params?: Record<string, any>): Observable<Blob> {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach((k) => {
        const v = params[k];
        if (v !== null && v !== undefined && v !== '') {
          httpParams = httpParams.set(k, String(v));
        }
      });
    }

    return this.http.get(`${this.api}/${reporte}`, {
      responseType: 'blob',
      params: httpParams,
    });
  }
}
