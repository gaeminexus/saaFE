import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, delay, of, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CalificacionResultado,
  ConfiguracionEscalaRiesgo,
  ProductoEscalaRiesgo,
  SolicitudCierreVigenciaEscala,
  SolicitudConfiguracionEscalaRiesgo,
} from '../model/riesgo/escala-calificacion-riesgo.model';
import { ServiciosCrd } from './ws-crd';

/**
 * Servicio HTTP de la parametrización de la escala de calificación de riesgo.
 *
 * Contrato cerrado por el árbitro (BE `3e89bb6`, 2026-09-07):
 * `docs/logica-negocio/crd/API-CALIFICACION-RIESGO.md` (en `saaBE`). Las rutas y formas de abajo
 * ya NO son especulativas — son un espejo directo de ese documento.
 *
 * `environment.mockEscalaRiesgo` queda en `false`: el contrato existe y el backend ya está en
 * `main`. El mock se conserva solo como respaldo de desarrollo (por si alguien necesita bocetar
 * sin levantar WildFly), no como comportamiento por defecto.
 *
 * Distinción con `bandas-cartera.service.ts` — NO se reutiliza a propósito: bandas resuelve una
 * clasificación CONTABLE (cuenta del asiento), esta resuelve una calificación REGULATORIA
 * (% de provisión SBS). Son dos parametrizaciones parecidas y deliberadamente separadas.
 */
@Injectable({ providedIn: 'root' })
export class EscalaCalificacionRiesgoService {
  private readonly base = ServiciosCrd.RS_CFCR;

  constructor(private http: HttpClient) {}

  /** Listado completo: una fila por producto de crédito, con su escala vigente (o sin ella). */
  getListado(idEmpresa?: number, fecha?: string): Observable<ProductoEscalaRiesgo[]> {
    if (environment.mockEscalaRiesgo) {
      return this.mockListado().pipe(delay(250));
    }
    let params = new HttpParams();
    if (idEmpresa != null) {
      params = params.set('idEmpresa', idEmpresa);
    }
    if (fecha) {
      params = params.set('fecha', fecha);
    }
    return this.http
      .get<ProductoEscalaRiesgo[]>(`${this.base}/listado`, { params })
      .pipe(catchError(this.handleError));
  }

  /** Todas las configuraciones (vigentes y cerradas) de un producto+empresa. */
  getHistorial(idProducto: number, idEmpresa?: number): Observable<ConfiguracionEscalaRiesgo[]> {
    if (environment.mockEscalaRiesgo) {
      return this.mockHistorial(idProducto).pipe(delay(250));
    }
    let params = new HttpParams().set('idProducto', idProducto);
    if (idEmpresa != null) {
      params = params.set('idEmpresa', idEmpresa);
    }
    return this.http
      .get<ConfiguracionEscalaRiesgo[]>(`${this.base}/historial`, { params })
      .pipe(catchError(this.handleError));
  }

  /** Graba cabecera + escala en una transacción (alta o edición en el lugar). */
  guardarConfiguracion(
    solicitud: SolicitudConfiguracionEscalaRiesgo,
  ): Observable<ConfiguracionEscalaRiesgo> {
    if (environment.mockEscalaRiesgo) {
      return this.mockGuardar(solicitud).pipe(delay(400));
    }
    return this.http
      .post<ConfiguracionEscalaRiesgo>(`${this.base}/guardarConfiguracion`, solicitud)
      .pipe(catchError(this.handleError));
  }

  /** Cierra la vigencia actual y abre una nueva desde la fecha dada. */
  cerrarVigencia(solicitud: SolicitudCierreVigenciaEscala): Observable<ConfiguracionEscalaRiesgo> {
    if (environment.mockEscalaRiesgo) {
      return this.mockGuardar({
        idConfiguracion: null,
        idProducto: 0,
        idEmpresa: null,
        nombre: 'Nueva vigencia',
        fechaDesde: solicitud.fechaDesdeNueva,
        fechaHasta: null,
        usuario: solicitud.usuario,
        escalas: solicitud.escalas,
      }).pipe(delay(400));
    }
    return this.http
      .post<ConfiguracionEscalaRiesgo>(`${this.base}/cerrarVigencia`, solicitud)
      .pipe(catchError(this.handleError));
  }

  /**
   * "Probador" (§10 del contrato): dado un número de días de mora, qué calificación y qué % de
   * provisión le corresponden. Usa el MISMO camino que `GeneracionG48ServiceImpl` — nunca puede
   * decir algo distinto de lo que sale en el reporte regulatorio real.
   */
  probar(
    idProducto: number,
    idEmpresa: number | undefined,
    dias: number,
    fecha?: string,
  ): Observable<CalificacionResultado> {
    if (environment.mockEscalaRiesgo) {
      return this.mockProbar(idProducto, dias).pipe(delay(250));
    }
    let params = new HttpParams().set('idProducto', idProducto).set('dias', dias);
    if (idEmpresa != null) {
      params = params.set('idEmpresa', idEmpresa);
    }
    if (fecha) {
      params = params.set('fecha', fecha);
    }
    return this.http
      .get<CalificacionResultado>(`${this.base}/probar`, { params })
      .pipe(catchError(this.handleError));
  }

  // ════════════════════════ Mock de desarrollo (respaldo, no es el camino por defecto) ═════════

  private mockListado(): Observable<ProductoEscalaRiesgo[]> {
    return of([
      {
        idProducto: 1,
        nombreProducto: 'Crédito Quirografario',
        estadoProducto: 1,
        configuracion: this.mockConfiguracion(1),
      },
      {
        idProducto: 2,
        nombreProducto: 'Crédito Hipotecario',
        estadoProducto: 1,
        configuracion: null,
      },
    ]);
  }

  private mockHistorial(idProducto: number): Observable<ConfiguracionEscalaRiesgo[]> {
    const vigente = this.mockConfiguracion(idProducto);
    return of(vigente ? [vigente] : []);
  }

  private mockGuardar(solicitud: SolicitudConfiguracionEscalaRiesgo): Observable<ConfiguracionEscalaRiesgo> {
    let cursor = 0;
    const config: ConfiguracionEscalaRiesgo = {
      idConfiguracion: solicitud.idConfiguracion ?? Math.floor(Math.random() * 100000),
      idProducto: solicitud.idProducto,
      nombreProducto: 'Crédito Quirografario',
      idEmpresa: solicitud.idEmpresa,
      nombre: solicitud.nombre,
      fechaDesde: this.isoAArray(solicitud.fechaDesde),
      fechaHasta: solicitud.fechaHasta ? this.isoAArray(solicitud.fechaHasta) : null,
      editable: true,
      estado: 1,
      escalas: solicitud.escalas.map((e, i) => {
        const diaDesde = cursor;
        cursor = e.diaHasta == null ? cursor : e.diaHasta + 1;
        return {
          idEscala: 1000 + i,
          calificacion: e.calificacion,
          diaDesde,
          diaHasta: e.diaHasta,
          etiqueta: e.diaHasta == null ? `mas de ${diaDesde - 1} (resto)` : `${diaDesde} - ${e.diaHasta}`,
          porcentajeProvision: e.porcentajeProvision,
        };
      }),
    };
    return of(config);
  }

  private mockProbar(idProducto: number, dias: number): Observable<CalificacionResultado> {
    const config = this.mockConfiguracion(idProducto);
    const fila = config?.escalas.find(
      (e) => dias >= e.diaDesde && (e.diaHasta == null || dias <= e.diaHasta),
    );
    if (!fila) {
      return throwError(() => `No se encontró ninguna calificación para ${dias} días de mora (mock).`);
    }
    return of({
      idConfiguracion: config!.idConfiguracion,
      idEscala: fila.idEscala,
      calificacion: fila.calificacion,
      porcentajeProvision: fila.porcentajeProvision,
      diaDesde: fila.diaDesde,
      diaHasta: fila.diaHasta,
    });
  }

  /** Escala de ejemplo, con `diaDesde` ya derivado como lo haría el backend real. */
  private mockConfiguracion(idProducto: number): ConfiguracionEscalaRiesgo | null {
    if (idProducto !== 1) {
      return null;
    }
    const filas: [string, number | null, number][] = [
      ['A1', 8, 0.01],
      ['A2', 15, 0.05],
      ['A3', 30, 0.1],
      ['B1', 60, 0.2],
      ['B2', 90, 0.3],
      ['C1', 120, 0.5],
      ['C2', 150, 0.7],
      ['D', 180, 0.9],
      ['E', null, 1.0],
    ];
    let cursor = 0;
    return {
      idConfiguracion: 500,
      idProducto,
      nombreProducto: 'Crédito Quirografario',
      idEmpresa: null,
      nombre: 'Escala vigente 2026',
      fechaDesde: [2026, 1, 1],
      fechaHasta: null,
      editable: false,
      estado: 1,
      escalas: filas.map(([calificacion, diaHasta, porcentajeProvision], i) => {
        const diaDesde = cursor;
        cursor = diaHasta == null ? cursor : diaHasta + 1;
        return {
          idEscala: 100 + i,
          calificacion,
          diaDesde,
          diaHasta,
          etiqueta: diaHasta == null ? `mas de ${diaDesde - 1} (resto)` : `${diaDesde} - ${diaHasta}`,
          porcentajeProvision,
        };
      }),
    };
  }

  private isoAArray(iso: string): number[] {
    const [y, m, d] = iso.split('-').map(Number);
    return [y, m, d];
  }

  // ════════════════════════ Manejo de errores (mismo patrón que bandas-cartera) ════════════════

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    return throwError(() => this.extraerMensajeError(error));
  };

  /**
   * Un 404/0 se lee como "el backend todavía no tiene este endpoint desplegado en este ambiente"
   * (p.ej. el WAR de producción no actualizado todavía), nunca como un error genérico ni se deja
   * la pantalla en blanco — pedido explícito del árbitro, 2026-09-07.
   */
  private extraerMensajeError(error: HttpErrorResponse): string {
    if (error?.status === 404 || error?.status === 0) {
      return 'El servicio de escala de calificación de riesgo todavía no está disponible en este ambiente.';
    }
    const cuerpo: unknown = error?.error;
    const desdeObjeto = this.leerCampoMensaje(cuerpo);
    if (desdeObjeto) {
      return desdeObjeto;
    }
    if (typeof cuerpo === 'string' && cuerpo.trim()) {
      const desdeTexto = this.leerCampoMensaje(this.intentarJson(cuerpo));
      return (desdeTexto ?? cuerpo).trim();
    }
    if (error?.message) {
      return error.message;
    }
    return 'Ocurrió un error al comunicarse con el servidor.';
  }

  private leerCampoMensaje(valor: unknown): string | null {
    if (valor && typeof valor === 'object') {
      const mensaje = (valor as { mensaje?: unknown }).mensaje;
      if (typeof mensaje === 'string' && mensaje.trim()) {
        return mensaje.trim();
      }
    }
    return null;
  }

  private intentarJson(texto: string): unknown {
    try {
      return JSON.parse(texto);
    } catch {
      return null;
    }
  }
}
