import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal, computed } from '@angular/core';
import { Observable, catchError, of, throwError, tap } from 'rxjs';
import { DetalleRubro } from '../model/detalle-rubro';
import { ServiciosShare } from './ws-share';

@Injectable({
  providedIn: 'root'
})
export class DetalleRubroService {
  // Signal para datos reactivos
  private detallesSignal = signal<DetalleRubro[]>([]);
  private cargaCompletada = signal<boolean>(false);

  // Computed para verificar si hay datos
  private hayDatos = computed(() => this.detallesSignal().length > 0);

  constructor(private http: HttpClient) {}

  /**
   * Inicializa los detalles de rubro (llamar desde AppStateService)
   * Solo carga una vez, luego usa caché
   */
  inicializar(): Observable<DetalleRubro[]> {
    // Si ya están cargados, retornar inmediatamente
    if (this.cargaCompletada()) {
      return of(this.detallesSignal());
    }

    const url = `${ServiciosShare.RS_PDTR}/getAll`;

    return this.http.get<DetalleRubro[]>(url).pipe(
      tap(detalles => {
        this.detallesSignal.set(detalles || []);
        this.cargaCompletada.set(true);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * @deprecated Usar inicializar() desde AppStateService en login
   */
  getAll(): Observable<DetalleRubro[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosShare.RS_PDTR}${wsGetById}`;
    return this.http.get<DetalleRubro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene detalles de un rubro específico desde el backend
   * (Útil para refrescar datos de un rubro sin recargar todos)
   */
  getRubros(idRubro: number): Observable<DetalleRubro[] | null> {
    const wsGetById = '/getRubros/' + idRubro;
    const url = `${ServiciosShare.RS_PDTR}${wsGetById}`;
    return this.http.get<DetalleRubro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * @deprecated Usar inicializar() en AppStateService. Mantenido por compatibilidad.
   */
  setDetalles(detalle: DetalleRubro[]): void {
    this.detallesSignal.set(detalle || []);
    this.cargaCompletada.set(true);
  }

  /**
   * Obtiene todos los detalles (síncrono, usa caché)
   */
  getDetalles(): DetalleRubro[] {
    if (!this.hayDatos()) {
      console.warn('DetalleRubroService: Datos no cargados. Llama a inicializar() primero.');
      return [];
    }
    return this.detallesSignal();
  }

  /**
   * Filtra detalles por ID de rubro padre
   */
  getDetallesByParent(idPadre: number): DetalleRubro[] {
    return this.detallesSignal().filter(
      detalle => detalle.rubro.codigoAlterno === idPadre
    );
  }

  /**
   * Obtiene descripción por padre y código alterno
   */
  getDescripcionByParentAndAlterno(idPadre: number, alterno: number): string {
    const detalle = this.detallesSignal().find(
      d => d.rubro.codigoAlterno === idPadre && d.codigoAlterno === alterno
    );
    return detalle?.descripcion || '';
  }

  /**
   * Obtiene valor numérico por padre y código alterno
   */
  getNumeroByParentAndAlterno(idPadre: number, alterno: number): number {
    const detalle = this.detallesSignal().find(
      d => d.rubro.codigoAlterno === idPadre && d.codigoAlterno === alterno
    );
    return detalle?.valorNumerico || 0;
  }

  /**
   * Verifica si los datos están cargados
   */
  estanDatosCargados(): boolean {
    return this.cargaCompletada();
  }

  /**
   * Limpia la caché (útil para logout o refresh forzado)
   */
  limpiarCache(): void {
    this.detallesSignal.set([]);
    this.cargaCompletada.set(false);
  }

  /**
   * @deprecated Método interno, usar filtrado directo
   */
  filtraRubros(idPadre: number): any {
    return function (element: any): any {
      return (element.rubro.codigoAlterno === idPadre);
    };
  }

  private handleError(error: HttpErrorResponse) {
    if (+error.status === 200) {
      return of([]);
    }
    console.error('DetalleRubroService: Error HTTP', error);
    return throwError(() => error.error);
  }

}
