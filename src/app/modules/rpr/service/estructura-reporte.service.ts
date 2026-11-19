import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Cuerpo de `POST /esrp/generar` y `/esrp/archivo` (saaBE C19, `SolicitudEstructura`). La estructura se elige
 * por `codigoEstructura` (B17, FLC) o por `codigoAlterno` (RPRTALTR).
 */
export interface SolicitudEstructura {
  empresa: number;
  codigoEstructura?: string;
  codigoAlterno?: number;
  /** aaaa-mm-dd (obligatoria). */
  fechaCorte: string;
  /** aaaa-mm-dd; por defecto el 1 del mes de corte. */
  fechaInicio?: string;
  /** aaaa-mm-dd; agrega valor comparativo y variación por renglón. */
  fechaComparacion?: string;
  fechaInicioComparacion?: string;
  /**
   * true = generar aunque el mes no esté cerrado: sale marcado PRELIMINAR y el archivo con sufijo
   * `_PRELIMINAR` (no presentable). false = exige el mes cerrado (REPORTE_MES_NO_CERRADO).
   */
  preliminar?: boolean;
}

/** Renglón de `ResultadoEstructura` (`LineaEstructura`). */
export interface LineaEstructura {
  codigo: string;
  nombre: string | null;
  nivel: number | null;
  orden: number;
  vaEnArchivo: boolean;
  valor: number | null;
  valorComparativo: number | null;
  variacion: number | null;
}

/** Respuesta de `POST /esrp/generar`. */
export interface ResultadoEstructura {
  codigoEstructura: string;
  nombre: string;
  titulo: string;
  lineas: LineaEstructura[];
  sumaControl: number | null;
  advertencias: string[];
  nombreArchivo: string | null;
  /** No se usa para descargar: el archivo se pide a `/esrp/archivo` para conservar sus bytes. */
  contenidoArchivo: string | null;
  preliminar: boolean;
}

/**
 * Estructuras de renglones de la Superintendencia (C19): B17 y flujo de caja (FLC). Ver saaBE
 * `docs/logica-negocio/rpr/ESTRUCTURAS-DE-RENGLONES.md`.
 */
@Injectable({ providedIn: 'root' })
export class EstructuraReporteService {
  private readonly api = `${environment.apiUrl}/esrp`;

  constructor(private http: HttpClient) {}

  /** Renglones, suma de control, advertencias y nombre del archivo (JSON). */
  generar(s: SolicitudEstructura): Observable<ResultadoEstructura> {
    return this.http.post<ResultadoEstructura>(`${this.api}/generar`, s);
  }

  /**
   * El archivo tal como se presenta (latin1, TAB, CRLF). Se recibe como `Blob` y no se toca: ni texto, ni
   * codificación, ni fin de línea. El nombre viene en `Content-Disposition`.
   */
  archivo(s: SolicitudEstructura): Observable<HttpResponse<Blob>> {
    return this.http.post(`${this.api}/archivo`, s, { responseType: 'blob', observe: 'response' });
  }
}
