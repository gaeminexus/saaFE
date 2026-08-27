import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, delay, of, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  ContratoPorEntidadDTO,
  ID_TIPO_APORTE,
  MODO_VIGENCIA,
  MODO_VIGENCIA_TEXTO,
  NuevaVigenciaRequest,
  VigenciaDTO,
} from '../model/vigencia-contrato';
import { ServiciosCrd } from './ws-crd';

/**
 * §4.1 del plan de devengo. El backend todavía no publica `/rest/cntr/porEntidad`,
 * `/rest/vgcn/porContrato`, `POST /rest/vgcn` ni `DELETE /rest/vgcn/{id}`: mientras
 * `environment.mockDevengoContratos` esté en `true`, este servicio simula un historial de
 * vigencias EN MEMORIA (se pierde al recargar la página) contra el contrato congelado. Apagar el
 * flag hace que llame al backend real sin tocar el componente.
 */
@Injectable({
  providedIn: 'root',
})
export class VigenciaContratoService {
  /** idEntidad → estado simulado. Sembrado la primera vez que se pide ese entidad. */
  private mockPorEntidad = new Map<number, ContratoPorEntidadDTO>();
  /** idContrato → idEntidad, para resolver los endpoints que solo reciben idContrato. */
  private mockIdxContrato = new Map<number, number>();
  private mockSiguienteIdVigencia = 1000;

  constructor(private http: HttpClient) {}

  porEntidad(idEntidad: number, idContrato: number): Observable<ContratoPorEntidadDTO | null> {
    if (environment.mockDevengoContratos) {
      return of(this.obtenerOSembrar(idEntidad, idContrato)).pipe(delay(300));
    }
    return this.http
      .get<ContratoPorEntidadDTO>(`${ServiciosCrd.RS_CNTR}/porEntidad/${idEntidad}`)
      .pipe(catchError(this.handleError));
  }

  historialPorContrato(idContrato: number): Observable<VigenciaDTO[] | null> {
    if (environment.mockDevengoContratos) {
      const idEntidad = this.mockIdxContrato.get(idContrato);
      const estado = idEntidad != null ? this.mockPorEntidad.get(idEntidad) : undefined;
      return of(estado ? [...estado.vigencias] : []).pipe(delay(300));
    }
    return this.http
      .get<VigenciaDTO[]>(`${ServiciosCrd.RS_VGCN}/porContrato/${idContrato}`)
      .pipe(catchError(this.handleError));
  }

  crear(datos: NuevaVigenciaRequest): Observable<VigenciaDTO | null> {
    if (environment.mockDevengoContratos) {
      const idEntidad = this.mockIdxContrato.get(datos.idContrato);
      const estado = idEntidad != null ? this.mockPorEntidad.get(idEntidad) : undefined;
      if (!estado) {
        return throwError(() => ({ mensaje: 'Contrato no encontrado (mock).' }));
      }

      const abierta = estado.vigencias.find(
        (v) => v.idTipoAporte === datos.idTipoAporte && v.fechaFin === null
      );
      if (abierta) {
        abierta.fechaFin = restarUnDia(datos.fechaInicio);
      }

      const nueva: VigenciaDTO = {
        idVigencia: this.mockSiguienteIdVigencia++,
        idContrato: datos.idContrato,
        idTipoAporte: datos.idTipoAporte,
        nombreTipoAporte: nombreTipoAporte(datos.idTipoAporte),
        fechaInicio: datos.fechaInicio,
        fechaFin: null,
        monto: datos.monto,
        porcentaje: datos.porcentaje,
        remuneracion: datos.modo === MODO_VIGENCIA.CALCULADO ? estado.remuneracionUnificada : null,
        modo: datos.modo,
        modoTexto: MODO_VIGENCIA_TEXTO[datos.modo] ?? String(datos.modo),
        estado: 1,
        observacion: datos.observacion,
      };
      estado.vigencias.unshift(nueva);

      if (datos.idTipoAporte === ID_TIPO_APORTE.JUBILACION) {
        estado.montoJubilacion = nueva.monto;
        estado.porcentajeJubilacion = nueva.porcentaje;
      } else if (datos.idTipoAporte === ID_TIPO_APORTE.CESANTIA) {
        estado.montoCesantia = nueva.monto;
        estado.porcentajeCesantia = nueva.porcentaje;
      }

      return of({ ...nueva }).pipe(delay(300));
    }
    return this.http.post<VigenciaDTO>(ServiciosCrd.RS_VGCN, datos).pipe(catchError(this.handleError));
  }

  anular(idVigencia: number): Observable<unknown> {
    if (environment.mockDevengoContratos) {
      for (const estado of this.mockPorEntidad.values()) {
        const vigencia = estado.vigencias.find((v) => v.idVigencia === idVigencia);
        if (vigencia) {
          vigencia.estado = 0;
          const esLaVigente =
            estado.vigencias.find((v) => v.idTipoAporte === vigencia.idTipoAporte && v.fechaFin === null)
              ?.idVigencia === idVigencia;
          if (esLaVigente) {
            if (vigencia.idTipoAporte === ID_TIPO_APORTE.JUBILACION) {
              estado.montoJubilacion = null;
              estado.porcentajeJubilacion = null;
            } else if (vigencia.idTipoAporte === ID_TIPO_APORTE.CESANTIA) {
              estado.montoCesantia = null;
              estado.porcentajeCesantia = null;
            }
          }
          break;
        }
      }
      return of({ exito: true }).pipe(delay(300));
    }
    return this.http
      .delete(`${ServiciosCrd.RS_VGCN}/${idVigencia}`)
      .pipe(catchError(this.handleError));
  }

  private obtenerOSembrar(idEntidad: number, idContrato: number): ContratoPorEntidadDTO {
    let estado = this.mockPorEntidad.get(idEntidad);
    if (!estado) {
      estado = sembrarContrato(idEntidad, idContrato);
      this.mockPorEntidad.set(idEntidad, estado);
      this.mockIdxContrato.set(idContrato, idEntidad);
    }
    return { ...estado, vigencias: [...estado.vigencias] };
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}

function nombreTipoAporte(idTipoAporte: number): string {
  return idTipoAporte === ID_TIPO_APORTE.JUBILACION ? 'JUBILACIÓN' : 'CESANTÍA';
}

/** `yyyy-MM-dd` → el día anterior, también `yyyy-MM-dd`. */
function restarUnDia(fechaISO: string): string {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const fecha = new Date(y, m - 1, d - 1);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

/**
 * Datos de arranque del mock: una vigencia CALCULADA de jubilación y una FIJA de cesantía, ambas
 * vigentes, para poder demostrar el historial y el flujo de "nueva vigencia" sin depender del
 * backend. Determinístico por `idContrato` (nada de Math.random) para que no cambie en cada carga.
 */
function sembrarContrato(idEntidad: number, idContrato: number): ContratoPorEntidadDTO {
  const remuneracion = 400 + (idContrato % 7) * 50;
  const porcentajeJubilacion = 10;
  const montoJubilacion = +(remuneracion * porcentajeJubilacion / 100).toFixed(2);
  const montoCesantia = 25;

  const vigencias: VigenciaDTO[] = [
    {
      idVigencia: idContrato * 10 + 1,
      idContrato,
      idTipoAporte: ID_TIPO_APORTE.JUBILACION,
      nombreTipoAporte: 'JUBILACIÓN',
      fechaInicio: '2025-06-01',
      fechaFin: null,
      monto: montoJubilacion,
      porcentaje: porcentajeJubilacion,
      remuneracion,
      modo: MODO_VIGENCIA.CALCULADO,
      modoTexto: MODO_VIGENCIA_TEXTO[MODO_VIGENCIA.CALCULADO],
      estado: 1,
      observacion: 'Vigencia inicial (mock)',
    },
    {
      idVigencia: idContrato * 10 + 2,
      idContrato,
      idTipoAporte: ID_TIPO_APORTE.CESANTIA,
      nombreTipoAporte: 'CESANTÍA',
      fechaInicio: '2025-06-01',
      fechaFin: null,
      monto: montoCesantia,
      porcentaje: null,
      remuneracion: null,
      modo: MODO_VIGENCIA.FIJO,
      modoTexto: MODO_VIGENCIA_TEXTO[MODO_VIGENCIA.FIJO],
      estado: 1,
      observacion: 'Vigencia inicial (mock)',
    },
  ];

  return {
    idContrato,
    idEntidad,
    identificacion: `MOCK-${idEntidad}`,
    razonSocial: '(mock) usa el nombre real de la entidad, no este campo',
    estado: 'ACTIVO',
    montoJubilacion,
    montoCesantia,
    porcentajeJubilacion,
    porcentajeCesantia: null,
    remuneracionUnificada: remuneracion,
    vigencias,
  };
}
