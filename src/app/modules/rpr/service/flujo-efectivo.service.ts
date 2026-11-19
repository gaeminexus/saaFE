import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Cuerpo de `POST /flef/generar`, `/flef/excel`, `/flef/comparativo` y `/flef/comparativoExcel` (saaBE C38,
 * `SolicitudFlujoEfectivo`).
 */
export interface SolicitudFlujoEfectivo {
  empresa: number;
  anio: number;
  /** 1–12. */
  mes: number;
  /** MES = contra el cierre del mes anterior; ACUMULADO = contra el 31-dic del año anterior (o el arranque del SAA). */
  periodo?: 'MES' | 'ACUMULADO';
  /** true = genera aunque el mes no esté cerrado (sale PRELIMINAR). false = exige el mes cerrado (REPORTE_MES_NO_CERRADO). */
  preliminar?: boolean;
  /** true = calcula también el flujo de caja directo (formato BIESS) mes a mes. */
  incluirDirecto?: boolean;
  /** Solo `/flef/excel`: INDIRECTO (estado de flujos de efectivo, por defecto) o DIRECTO (flujo de caja BIESS). */
  reporte?: 'INDIRECTO' | 'DIRECTO';
}

export interface ControlFlujo {
  grupo: string;
  nombre: string;
  valor: number | null;
  esperado: number | null;
  diferencia: number | null;
  /** OK, ERROR o ADVERTENCIA. */
  estado: string;
  detalle: string | null;
}

export interface LineaFlujo {
  codigo: string;
  fila: number;
  nivel: number | null;
  concepto: string;
  formula: string | null;
  codigos: string | null;
  valor: number | null;
}

export interface FlujoCajaMes {
  anio: number;
  mes: number;
  saldoInicial: number;
  totalIngresos: number;
  totalEgresos: number;
  saldoFinal: number;
  lineas: LineaFlujo[];
  controles: ControlFlujo[];
}

/** Respuesta de `POST /flef/generar` (`ResultadoFlujoEfectivo`). */
export interface ResultadoFlujoEfectivo {
  anio: number;
  mes: number;
  periodo: string;
  fechaBase: string;
  fechaInicio: string;
  fechaCorte: string;
  preliminar: boolean;
  leyenda: string;
  lineas: LineaFlujo[];
  controles: ControlFlujo[];
  advertencias: string[];
  notas: string[];
  flujoCaja: FlujoCajaMes[];
  nombreArchivo: string;
}

/** Respuesta de `POST /flef/comparativo` (`ResultadoComparativo`). */
export interface ResultadoComparativo {
  fechaAnterior: string;
  fechaCorte: string;
  preliminar: boolean;
  leyenda: string;
  controles: ControlFlujo[];
  notas: string[];
  nombreArchivo: string;
}

/**
 * Formatos de ASOPREP derivados del B17 (C38): estado de flujos de efectivo (indirecto), flujo de caja (directo,
 * BIESS) y balance comparativo con formato. Ver saaBE `docs/logica-negocio/rpr/FLUJO-EFECTIVO-Y-COMPARATIVO.md`.
 */
@Injectable({ providedIn: 'root' })
export class FlujoEfectivoService {
  private readonly api = `${environment.apiUrl}/flef`;

  constructor(private http: HttpClient) {}

  generar(s: SolicitudFlujoEfectivo): Observable<ResultadoFlujoEfectivo> {
    return this.http.post<ResultadoFlujoEfectivo>(`${this.api}/generar`, s);
  }

  /** Excel con el formato (Blob tal cual; el nombre viene en `Content-Disposition`). */
  excel(s: SolicitudFlujoEfectivo): Observable<HttpResponse<Blob>> {
    return this.http.post(`${this.api}/excel`, s, { responseType: 'blob', observe: 'response' });
  }

  comparativo(s: SolicitudFlujoEfectivo): Observable<ResultadoComparativo> {
    return this.http.post<ResultadoComparativo>(`${this.api}/comparativo`, s);
  }

  comparativoExcel(s: SolicitudFlujoEfectivo): Observable<HttpResponse<Blob>> {
    return this.http.post(`${this.api}/comparativoExcel`, s, { responseType: 'blob', observe: 'response' });
  }
}
