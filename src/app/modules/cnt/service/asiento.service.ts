import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Asiento, EstadoAsiento, CrearAsiento, FiltrosAsiento } from '../model/asiento';
import { ServiciosCnt } from '../service/ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class AsientoService {
  private baseUrl = ServiciosCnt.RS_ASNT;

  constructor(private http: HttpClient) { }

  /**
   * Obtener todos los asientos
   */
  getAll(): Observable<Asiento[]> {
    return this.http.get<Asiento[]>(this.baseUrl);
  }

  /**
   * Obtener asiento por ID
   */
  getById(id: number): Observable<Asiento> {
    return this.http.get<Asiento>(`${this.baseUrl}/${id}`);
  }

  /**
   * Buscar asientos por criterios
   */
  selectByCriteria(filtros: FiltrosAsiento): Observable<Asiento[]> {
    const params: any = {};

    if (filtros.fechaDesde) {
      params.fechaDesde = filtros.fechaDesde.toISOString().split('T')[0];
    }

    if (filtros.fechaHasta) {
      params.fechaHasta = filtros.fechaHasta.toISOString().split('T')[0];
    }

    if (filtros.tipoAsiento) {
      params.tipoAsiento = filtros.tipoAsiento;
    }

    if (filtros.estado !== undefined && filtros.estado !== null) {
      params.estado = filtros.estado;
    }

    if (filtros.numero) {
      params.numero = filtros.numero;
    }

    return this.http.get<Asiento[]>(`${this.baseUrl}/criteria`, { params });
  }

  /**
   * Crear nuevo asiento
   */
  crearAsiento(datosAsiento: CrearAsiento): Observable<Asiento> {
    return this.http.post<Asiento>(this.baseUrl, datosAsiento);
  }

  /**
   * Actualizar asiento existente
   */
  actualizarAsiento(id: number, datosAsiento: CrearAsiento): Observable<Asiento> {
    return this.http.put<Asiento>(`${this.baseUrl}/${id}`, datosAsiento);
  }

  /**
   * Eliminar asiento
   */
  eliminarAsiento(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.baseUrl}/${id}`);
  }

  /**
   * Anular asiento
   */
  anularAsiento(id: number, razonAnulacion: string): Observable<boolean> {
    const params = { razonAnulacion };
    return this.http.put<boolean>(`${this.baseUrl}/${id}/anular`, null, { params });
  }

  /**
   * Reversar asiento
   */
  reversarAsiento(id: number, razonReverso: string): Observable<boolean> {
    const params = { razonReverso };
    return this.http.put<boolean>(`${this.baseUrl}/${id}/reversar`, null, { params });
  }

  /**
   * Obtener siguiente número de asiento
   */
  getSiguienteNumero(): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/siguiente-numero`);
  }

  /**
   * Validar que el asiento esté balanceado
   */
  validarBalance(detalles: any[]): boolean {
    const totalDebe = detalles.reduce((sum, d) => sum + (d.valorDebe || 0), 0);
    const totalHaber = detalles.reduce((sum, d) => sum + (d.valorHaber || 0), 0);
    return Math.abs(totalDebe - totalHaber) < 0.01; // Permitir diferencias mínimas por redondeo
  }

  /**
   * Obtener texto del estado
   */
  getEstadoTexto(estado: EstadoAsiento): string {
    switch (estado) {
      case EstadoAsiento.ACTIVO:
        return 'Activo';
      case EstadoAsiento.ANULADO:
        return 'Anulado';
      case EstadoAsiento.REVERSADO:
        return 'Reversado';
      case EstadoAsiento.INCOMPLETO:
        return 'Incompleto';
      default:
        return 'Desconocido';
    }
  }

  /**
   * Obtener clase CSS para badge de estado
   */
  getEstadoBadgeClass(estado: EstadoAsiento): string {
    switch (estado) {
      case EstadoAsiento.ACTIVO:
        return 'badge-activo';
      case EstadoAsiento.ANULADO:
        return 'badge-anulado';
      case EstadoAsiento.REVERSADO:
        return 'badge-reversado';
      case EstadoAsiento.INCOMPLETO:
        return 'badge-incompleto';
      default:
        return 'badge-default';
    }
  }

  /**
   * Verificar si se puede editar el asiento
   */
  puedeEditar(asiento: Asiento): boolean {
    return asiento.estado === EstadoAsiento.INCOMPLETO;
  }

  /**
   * Verificar si se puede anular el asiento
   */
  puedeAnular(asiento: Asiento): boolean {
    return asiento.estado === EstadoAsiento.ACTIVO;
  }

  /**
   * Verificar si se puede reversar el asiento
   */
  puedeReversar(asiento: Asiento): boolean {
    return asiento.estado === EstadoAsiento.ACTIVO;
  }

  /**
   * Verificar si se puede eliminar el asiento
   */
  puedeEliminar(asiento: Asiento): boolean {
    return asiento.estado === EstadoAsiento.INCOMPLETO;
  }
}
