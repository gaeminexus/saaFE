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
 * ⚠️ BOCETO — 2026-09-07. NO hay contrato REST acordado con el backend todavía (se lo pidió el
 * árbitro al equipo de BE). Las rutas de abajo (`RS_CFCR/...`) son ESPECULATIVAS, calcadas del
 * patrón de `bandas-cartera.service.ts` (que sí tiene contrato: `docs/crd/API-BANDAS-PRODUCTO.md`)
 * solo para que el componente tenga algo contra qué compilar mientras se acuerda el contrato real.
 *
 * `environment.mockEscalaRiesgo` está en `true` a propósito: sin contrato, la llamada real no
 * puede funcionar. Cuando el árbitro entregue el contrato, este es el ÚNICO archivo que debería
 * necesitar cambios (rutas, forma del body/respuesta) — el componente consume los mismos métodos
 * con la misma firma.
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
  getListado(idEmpresa: number, fecha?: string): Observable<ProductoEscalaRiesgo[]> {
    if (environment.mockEscalaRiesgo) {
      return this.mockListado().pipe(delay(250));
    }
    let params = new HttpParams().set('idEmpresa', idEmpresa);
    if (fecha) {
      params = params.set('fecha', fecha);
    }
    return this.http
      .get<ProductoEscalaRiesgo[]>(`${this.base}/listado`, { params })
      .pipe(catchError(this.handleError));
  }

  /** Todas las configuraciones (vigentes y cerradas) de un producto+empresa. */
  getHistorial(idProducto: number, idEmpresa: number): Observable<ConfiguracionEscalaRiesgo[]> {
    if (environment.mockEscalaRiesgo) {
      return this.mockHistorial(idProducto, idEmpresa).pipe(delay(250));
    }
    const params = new HttpParams().set('idProducto', idProducto).set('idEmpresa', idEmpresa);
    return this.http
      .get<ConfiguracionEscalaRiesgo[]>(`${this.base}/historial`, { params })
      .pipe(catchError(this.handleError));
  }

  /** Graba cabecera + las nueve filas de escala en una transacción (alta o edición en el lugar). */
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
        idProducto: solicitud.idConfiguracionVigente,
        idEmpresa: 1,
        nombre: 'Nueva vigencia',
        fechaInicio: solicitud.fechaInicioNueva,
        fechaFin: null,
        usuario: solicitud.usuario,
        ip: solicitud.ip,
        escalas: solicitud.escalas,
      }).pipe(delay(400));
    }
    return this.http
      .post<ConfiguracionEscalaRiesgo>(`${this.base}/cerrarVigencia`, solicitud)
      .pipe(catchError(this.handleError));
  }

  /**
   * "Probador": dado un número de días de mora, qué calificación y qué % de provisión le
   * corresponden. Es también la forma más barata de detectar un hueco: si el backend no
   * encuentra ninguna fila que cubra ese valor, debe responder un error explícito.
   */
  probar(
    idProducto: number,
    idEmpresa: number,
    diasMora: number,
    fecha?: string,
  ): Observable<CalificacionResultado> {
    if (environment.mockEscalaRiesgo) {
      return this.mockProbar(idProducto, idEmpresa, diasMora).pipe(delay(250));
    }
    let params = new HttpParams()
      .set('idProducto', idProducto)
      .set('idEmpresa', idEmpresa)
      .set('diasMora', diasMora);
    if (fecha) {
      params = params.set('fecha', fecha);
    }
    return this.http
      .get<CalificacionResultado>(`${this.base}/probar`, { params })
      .pipe(catchError(this.handleError));
  }

  // ════════════════════════ Mock de desarrollo — SIN contrato acordado ════════════════════════
  // Datos de ejemplo, no una respuesta congelada de ningún documento (a diferencia del mock de
  // `auditoria-bandas.service.ts`, que sí espeja un contrato ya escrito). Sirven para bocetar la
  // pantalla, no para validar comportamiento del backend real.

  private mockListado(): Observable<ProductoEscalaRiesgo[]> {
    return of([
      {
        idProducto: 1,
        nombreProducto: 'Crédito Quirografario',
        codigoSBS: '01',
        nombreTipoPrestamo: 'Consumo',
        estadoProducto: 1,
        vigente: this.mockConfiguracion(1, 1),
      },
      {
        idProducto: 2,
        nombreProducto: 'Crédito Hipotecario',
        codigoSBS: '02',
        nombreTipoPrestamo: 'Vivienda',
        estadoProducto: 1,
        vigente: null,
      },
    ]);
  }

  private mockHistorial(idProducto: number, idEmpresa: number): Observable<ConfiguracionEscalaRiesgo[]> {
    const vigente = this.mockConfiguracion(idProducto, idEmpresa);
    return of(vigente ? [vigente] : []);
  }

  private mockGuardar(solicitud: SolicitudConfiguracionEscalaRiesgo): Observable<ConfiguracionEscalaRiesgo> {
    const config: ConfiguracionEscalaRiesgo = {
      idConfiguracion: solicitud.idConfiguracion ?? Math.floor(Math.random() * 100000),
      idProducto: solicitud.idProducto,
      nombreProducto: 'Crédito Quirografario',
      idEmpresa: solicitud.idEmpresa,
      nombre: solicitud.nombre,
      fechaInicio: this.isoAArray(solicitud.fechaInicio),
      fechaFin: solicitud.fechaFin ? this.isoAArray(solicitud.fechaFin) : null,
      editable: true,
      estado: 1,
      escalas: solicitud.escalas.map((e, i) => ({
        idEscala: 1000 + i,
        idConfiguracion: solicitud.idConfiguracion ?? 0,
        calificacion: e.calificacion,
        diaDesde: e.diaDesde,
        diaHasta: e.diaHasta,
        porcentajeProvision: e.porcentajeProvision,
        orden: e.orden,
        estado: 1,
      })),
    };
    return of(config);
  }

  private mockProbar(idProducto: number, idEmpresa: number, diasMora: number): Observable<CalificacionResultado> {
    const config = this.mockConfiguracion(idProducto, idEmpresa);
    const fila = config?.escalas.find(
      (e) => diasMora >= e.diaDesde && (e.diaHasta == null || diasMora <= e.diaHasta),
    );
    if (!fila) {
      return throwError(() => `No se encontró ninguna calificación para ${diasMora} días de mora (mock).`);
    }
    return of({
      idConfiguracion: config!.idConfiguracion,
      idProducto,
      idEmpresa,
      diasMora,
      escala: fila,
    });
  }

  /** Escala de ejemplo, deliberadamente BIEN formada (sin huecos ni solapes) para el mock feliz. */
  private mockConfiguracion(idProducto: number, idEmpresa: number): ConfiguracionEscalaRiesgo | null {
    if (idProducto !== 1) {
      return null;
    }
    const filas: [string, number, number | null, number][] = [
      ['A1', 0, 8, 1],
      ['A2', 9, 15, 5],
      ['A3', 16, 30, 10],
      ['B1', 31, 60, 20],
      ['B2', 61, 90, 30],
      ['C1', 91, 120, 50],
      ['C2', 121, 150, 70],
      ['D', 151, 180, 90],
      ['E', 181, null, 100],
    ];
    return {
      idConfiguracion: 500,
      idProducto,
      nombreProducto: 'Crédito Quirografario',
      idEmpresa,
      nombre: 'Escala vigente 2026',
      fechaInicio: [2026, 1, 1],
      fechaFin: null,
      editable: false,
      estado: 1,
      escalas: filas.map(([calificacion, diaDesde, diaHasta, porcentajeProvision], i) => ({
        idEscala: 100 + i,
        idConfiguracion: 500,
        calificacion,
        diaDesde,
        diaHasta,
        porcentajeProvision,
        orden: i + 1,
        estado: 1,
      })),
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

  private extraerMensajeError(error: HttpErrorResponse): string {
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
