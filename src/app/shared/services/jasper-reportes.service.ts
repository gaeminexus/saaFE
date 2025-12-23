import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class JasperReportesService {
  private readonly api = `${environment.apiUrl.replace('/rest', '')}/api/reportes`;

  constructor(private http: HttpClient) {}

  generar(reporte: string): Observable<Blob> {
    return this.http.get(`${this.api}/${reporte}`, {
      responseType: 'blob',
    });
  }
}
